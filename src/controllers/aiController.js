import TransactionModel from '../models/transactionModel.js';
import BudgetModel from '../models/budgetModel.js';
import GoalModel from '../models/goalModel.js';
import AnalyticsService from '../services/analyticsService.js';
import PartnershipModel from '../models/partnershipModel.js';
import CategoryModel from '../models/categoryModel.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import cacheEngine from '../utils/cache.js';


async function getFinancialContext(userId, mode) {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    let partnerId = null;
    let partnerName = '';

    if (mode === 'couple') {
      const partner = await PartnershipModel.getActivePartner(userId);
      if (partner) {
        partnerId = partner.partner_id;
        partnerName = partner.partner_username;
      }
    }

    const [summary, budgets, goals, health] = await Promise.all([
      TransactionModel.getSummary(userId, partnerId),
      BudgetModel.getAll(userId, month, year, partnerId),
      GoalModel.getAll(userId, partnerId),
      AnalyticsService.getFinancialHealthScore(userId)
    ]);

    // Format list anggaran
    const budgetDetails = budgets.map(b => `- Kategori: ${b.category}, Batas: Rp${b.amount}`).join('\n');
    // Format list target tabungan
    const goalDetails = goals.map(g => `- Target: ${g.name}, Nominal: Rp${g.target_amount}, Terkumpul: Rp${g.current_amount}, Tenggat: ${g.target_date}`).join('\n');

    let modeDescription = 'laporan mandiri';
    let partnerContext = '';
    if (mode === 'couple' && partnerName) {
      modeDescription = `laporan gabungan bersama pasangan Anda yang bernama "${partnerName}"`;
      partnerContext = `\nPengguna saat ini menggunakan Mode Pasangan bersama "${partnerName}". Seluruh data di bawah ini adalah data konsolidasi (gabungan) mereka berdua. Berikan rekomendasi yang berfokus pada kerja sama finansial, komunikasi terbuka, dan pencapaian target bersama pasangan secara positif.`;
    }

    return `
Anda adalah KeuanganKu AI, asisten keuangan pribadi dan keluarga yang cerdas, ramah, dan profesional.
Tugas Anda adalah menganalisis kondisi keuangan pengguna saat ini dan memberikan rekomendasi, jawaban, dan motivasi yang relevan berdasarkan data keuangan mereka.

Berikut adalah ringkasan keuangan pengguna saat ini untuk referensi Anda (${modeDescription}):${partnerContext}
- Saldo Aktif: Rp${summary.balance} (Pemasukan: Rp${summary.total_income}, Pengeluaran: Rp${summary.total_expense})
- Skor Kesehatan Finansial: ${health.financial_health_score}/100 dengan rating "${health.grade}"
- Poin Penilaian Kesehatan Keuangan:
${health.assessments.map(a => `  * ${a}`).join('\n')}

Daftar Anggaran Bulanan Pengguna:
${budgetDetails || '- Belum ada anggaran bulanan.'}

Daftar Target Tabungan Pengguna:
${goalDetails || '- Belum ada target tabungan.'}

Berikan saran yang praktis, ramah, realistis, dan memotivasi pengguna dalam bahasa Indonesia. Selalu ingatkan mereka secara sopan jika pengeluaran mereka terlalu tinggi atau ada anggaran yang jebol. Batasi respons Anda agar padat, ringkas, dan mudah dibaca di layar HP.
PENTING: Jangan gunakan format Markdown tebal seperti asterisks (**) dalam respon Anda. Ketik semua tulisan sebagai teks polos biasa tanpa simbol format bold/tebal Markdown.
    `;
  } catch (error) {
    console.error('Error gathering financial context for AI:', error);
    return 'Anda adalah KeuanganKu AI, asisten keuangan pribadi yang cerdas dan profesional. Bantu pengguna mengelola keuangan mereka secara umum.';
  }
}

function simulateAIResponse(message, res) {
  const msgLower = message.toLowerCase();
  let reply = 'Halo! Saya KeuanganKu AI. Sepertinya kunci API Gemini belum dikonfigurasi di server, namun saya dapat menyimulasikan saran keuangan untuk Anda.';
  
  if (msgLower.includes('hemat') || msgLower.includes('tips')) {
    reply = 'Tips Hemat KeuanganKu:\n1. Terapkan metode anggaran 50/30/20 (50% kebutuhan pokok, 30% keinginan, 20% tabungan).\n2. Catat semua pengeluaran kecil (seperti parkir/kopi) karena bocor halus seringkali berasal dari hal kecil.\n3. Masak sendiri di rumah dan batasi makan di luar maksimal 2 kali seminggu.\n4. Sebelum membeli barang impulsif, tunggu 24 jam untuk berpikir apakah barang itu benar-benar dibutuhkan.';
  } else if (msgLower.includes('darurat') || msgLower.includes('emergency')) {
    reply = 'Dana darurat sangat penting! Disarankan memiliki dana darurat minimal sebesar 3-6 kali pengeluaran bulanan Anda jika Anda lajang, dan 6-12 kali jika Anda sudah berkeluarga atau memiliki tanggungan. Simpanlah di instrumen likuid dan aman seperti Reksadana Pasar Uang atau rekening tabungan terpisah.';
  } else if (msgLower.includes('investasi') || msgLower.includes('saham') || msgLower.includes('reksa')) {
    reply = 'Untuk investasi, prinsip utamanya adalah: pahami risikonya sebelum menaruh uang Anda. Bagi pemula, mulailah dengan instrumen berisiko rendah seperti Reksadana Pasar Uang atau Obligasi Negara. Jika profil risiko Anda moderat/agresif, Anda bisa mulai mempelajari reksadana saham, emas, atau saham blue-chip.';
  } else if (msgLower.includes('analisis') || msgLower.includes('kondisi') || msgLower.includes('saldo')) {
    reply = 'Berdasarkan data simulasi, kondisi keuangan Anda stabil. Namun tetap disarankan untuk memantau pos anggaran yang mendekati batas maksimal. Usahakan untuk menyisihkan tabungan langsung di awal bulan, bukan menyisakan di akhir bulan!';
  }

  return res.json({
    success: true,
    data: {
      message: reply + '\n\n*(Catatan: Ini adalah tanggapan simulasi luring karena GEMINI_API_KEY belum dikonfigurasi)*'
    }
  });
}

const AIController = {
  async chatWithAI(req, res, next) {
    try {
      const userId = req.user.id;
      const mode = req.query.mode || req.body.mode;
      const { message, history = [] } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({ success: false, message: 'Pesan tidak boleh kosong.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;

      // Jika kunci API tidak dikonfigurasi, jalankan Mock Resilient Response
      if (!apiKey || apiKey.trim() === '') {
        console.warn('[AI] GEMINI_API_KEY tidak dikonfigurasi. Menggunakan Resilient Mock Response.');
        return simulateAIResponse(message, res);
      }

      const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
      });

      const systemInstruction = await getFinancialContext(userId, mode);

      // Pastikan pesan pertama dalam riwayat memiliki role 'user' (diharuskan oleh SDK Gemini)
      const firstUserIndex = history.findIndex(h => h.role === 'user');
      const cleanHistory = firstUserIndex !== -1 ? history.slice(firstUserIndex) : [];

      let responseText = '';

      try {
        // Mulai chat dengan histori dan instruksi sistem
        const chat = model.startChat({
          history: cleanHistory.map(h => ({
            role: h.role === 'model' ? 'model' : 'user',
            parts: [{ text: h.parts?.[0]?.text || h.message || '' }]
          })),
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          }
        });

        const result = await chat.sendMessage(message);
        responseText = result.response.text();
      } catch (geminiError) {
        const fallbackModelName = process.env.GEMINI_FALLBACK_MODEL || 'gemini-1.5-flash';
        console.warn(`[AI] Gagal menggunakan model ${modelName}:`, geminiError.message);
        console.info(`[AI] Mencoba menggunakan model alternatif '${fallbackModelName}'...`);

        try {
          const fallbackModel = genAI.getGenerativeModel({
            model: fallbackModelName,
          });

          const chat = fallbackModel.startChat({
            history: cleanHistory.map(h => ({
              role: h.role === 'model' ? 'model' : 'user',
              parts: [{ text: h.parts?.[0]?.text || h.message || '' }]
            })),
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            }
          });

          const result = await chat.sendMessage(message);
          responseText = result.response.text();
        } catch (fallbackError) {
          console.error('[AI] Gagal menggunakan model alternatif. Menggunakan Resilient Mock Response:', fallbackError.message);
          return simulateAIResponse(message, res);
        }
      }

      // Bersihkan tanda bintang ganda (**) jika AI masih mengembalikannya
      const cleanResponseText = responseText.replace(/\*\*/g, '');

      return res.json({
        success: true,
        data: {
          message: cleanResponseText
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async parseTransaction(req, res, next) {
    try {
      const userId = req.user.id;
      const { text } = req.body;

      if (!text || !text.trim()) {
        return res.status(400).json({ success: false, message: 'Teks tidak boleh kosong.' });
      }

      // 1. Dapatkan kategori aktif pengguna
      const categories = await CategoryModel.getAll(userId);

      const apiKey = process.env.GEMINI_API_KEY;
      const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

      // Fallback luring jika API Key tidak disetel
      if (!apiKey || apiKey.trim() === '') {
        console.warn('[AI] GEMINI_API_KEY tidak dikonfigurasi. Menggunakan Resilient Mock Parser.');
        const mockResult = simulateParsing(text, categories);
        return res.json({ success: true, data: mockResult });
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
      });

      const todayStr = new Date().toISOString().split('T')[0];
      const categoriesStr = categories.map(c => `- ${c.name} (${c.type === 'expense' ? 'pengeluaran' : 'pemasukan'})`).join('\n');

      const prompt = `
Ekstrak data transaksi dari kalimat bahasa Indonesia berikut: "${text}".
Hari ini adalah tanggal: ${todayStr}.

Daftar kategori yang tersedia di sistem:
${categoriesStr}

Kembalikan respon hanya berupa JSON string murni (tanpa block code markdown, tanpa tambahan penjelasan) dengan skema berikut:
{
  "type": "expense" atau "income" (gunakan "expense" untuk pengeluaran/belanja/bayar, dan "income" untuk pemasukan/gaji/transfer masuk),
  "amount": angka nominal saja (integer, contoh: 25000),
  "category": nama kategori yang PALING cocok dari daftar kategori tersedia di atas. Jika tidak ada yang benar-benar cocok, gunakan "Lain-lain",
  "date": tanggal transaksi dalam format YYYY-MM-DD (jika di kalimat tidak ada penyebutan hari spesifik, asumsikan hari ini yaitu ${todayStr}),
  "note": catatan deskripsi singkat mengenai transaksi tersebut (contoh: "makan siang nasi goreng").
}
      `;

      try {
        const result = await model.generateContent(prompt);
        const jsonText = result.response.text().trim();
        const cleanJsonText = jsonText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        const parsedData = JSON.parse(cleanJsonText);
        return res.json({ success: true, data: parsedData });
      } catch (err) {
        console.warn('[AI] Gagal mengurai dengan Gemini:', err.message);
        console.info('[AI] Menggunakan fallback parsing lokal.');
        const fallbackResult = simulateParsing(text, categories);
        return res.json({ success: true, data: fallbackResult });
      }
    } catch (error) {
      next(error);
    }
  },

  async scanReceipt(req, res, next) {
    try {
      const userId = req.user.id;
      const { image, mimeType } = req.body;

      if (!image || !mimeType) {
        return res.status(400).json({ success: false, message: 'Gambar struk dan mimeType wajib dikirim.' });
      }

      // 1. Dapatkan kategori aktif pengguna
      const categories = await CategoryModel.getAll(userId);

      const apiKey = process.env.GEMINI_API_KEY;
      const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

      // Fallback luring jika API Key tidak disetel
      if (!apiKey || apiKey.trim() === '') {
        console.warn('[AI] GEMINI_API_KEY tidak dikonfigurasi. Menggunakan Resilient Mock Receipt Parser.');
        const mockResult = simulateReceiptParsing(categories);
        return res.json({ success: true, data: mockResult });
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
      });

      const todayStr = new Date().toISOString().split('T')[0];
      const categoriesStr = categories.filter(c => c.type === 'expense').map(c => `- ${c.name}`).join('\n');

      const prompt = `
Ekstrak data pengeluaran (transaksi) dari struk belanja berikut.
Hari ini adalah tanggal: ${todayStr}.

Daftar kategori pengeluaran yang tersedia di sistem:
${categoriesStr}

Kembalikan respon hanya berupa JSON string murni (tanpa block code markdown, tanpa tambahan penjelasan) dengan skema berikut:
{
  "type": "expense",
  "amount": angka nominal total belanja saja (integer, contoh: 25000),
  "category": nama kategori pengeluaran yang PALING cocok dari daftar kategori pengeluaran di atas (misalnya jika struk minimarket gunakan Belanja Harian, struk kafe gunakan Makanan & Minuman). Jika tidak ada yang benar-benar cocok, gunakan "Lain-lain",
  "date": tanggal transaksi pada struk dalam format YYYY-MM-DD (jika di struk tidak terbaca tanggalnya secara jelas, asumsikan hari ini yaitu ${todayStr}),
  "note": catatan deskripsi singkat mengenai tempat belanja atau nama tempatnya (contoh: "Struk belanja di Indomaret").
}
      `;

      const imagePart = {
        inlineData: {
          data: image,
          mimeType
        }
      };

      try {
        const result = await model.generateContent([prompt, imagePart]);
        const jsonText = result.response.text().trim();
        const cleanJsonText = jsonText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        const parsedData = JSON.parse(cleanJsonText);
        return res.json({ success: true, data: parsedData });
      } catch (err) {
        console.warn('[AI] Gagal memindai struk dengan Gemini:', err.message);
        console.info('[AI] Menggunakan fallback parsing struk lokal.');
        const fallbackResult = simulateReceiptParsing(categories);
        return res.json({ success: true, data: fallbackResult });
      }
    } catch (error) {
      next(error);
    }
  },

  async getFinancialForecast(req, res, next) {
    try {
      const userId = req.user.id;
      const mode = req.query.mode || req.body.mode;

      const cacheKey = `analysis:${userId}:ai-forecast:${mode || 'solo'}`;
      const cachedData = await cacheEngine.get(cacheKey);

      if (cachedData) {
        console.log(`[Cache Hit] Mengambil AI Financial Forecast dari cache untuk user ${userId} (${mode || 'solo'})`);
        return res.json({
          success: true,
          from_cache: true,
          data: cachedData
        });
      }

      let partnerId = null;
      if (mode === 'couple') {
        const partner = await PartnershipModel.getActivePartner(userId);
        if (partner) {
          partnerId = partner.partner_id;
        }
      }

      // Ambil data historis keuangan (300 transaksi terakhir)
      const transactions = await TransactionModel.getAll(userId, { limit: 300, partnerId });
      const budgets = await BudgetModel.getAll(userId, null, null, partnerId);
      const goals = await GoalModel.getAll(userId, partnerId);

      const apiKey = process.env.GEMINI_API_KEY;
      const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

      // Fallback luring jika API Key tidak disetel
      if (!apiKey || apiKey.trim() === '') {
        console.warn('[AI] GEMINI_API_KEY tidak dikonfigurasi. Menggunakan Resilient Mock Forecaster.');
        const mockResult = simulateForecast(transactions, budgets);
        return res.json({ success: true, from_cache: false, data: mockResult });
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
      });

      const today = new Date();
      const nextMonthName = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
        new Date(today.getFullYear(), today.getMonth() + 1, 1)
      );

      const contextData = {
        currentBudgets: budgets.map(b => ({ category: b.category, limit: b.amount })),
        goals: goals.map(g => ({ name: g.name, target: g.target_amount, current: g.current_amount })),
        recentTransactions: transactions.map(t => ({
          type: t.type,
          amount: t.amount,
          category: t.category,
          date: t.date,
          note: t.note
        }))
      };

      const prompt = `
Anda adalah KeuanganKu AI, analis arus kas dan perencanaan keuangan profesional.
Tugas Anda adalah memproyeksikan perkiraan arus kas (pemasukan & pengeluaran) pengguna untuk bulan depan (${nextMonthName}) berdasarkan data historis pengeluaran dan pemasukan mereka.

Berikut data keuangan pengguna:
${JSON.stringify(contextData, null, 2)}

Analis data di atas secara mendalam:
1. Hitung perkiraan total pemasukan (predicted_income) dan total pengeluaran (predicted_expense) bulan depan berdasarkan rata-rata & tren historis.
2. Tentukan tingkat risiko defisit (risk_level) untuk bulan depan: "LOW", "MEDIUM", atau "HIGH".
3. Identifikasi pengeluaran musiman atau kategori yang rentan melonjak (misalnya pengeluaran liburan, biaya langganan, dll.) dan berikan saran mitigasi (warnings) dalam bahasa Indonesia.
4. Hilangkan tanda bintang tebal (**) dari warnings dan analysis_text.

Kembalikan respon hanya berupa JSON string murni (tanpa block code markdown, tanpa tambahan penjelasan) dengan skema berikut:
{
  "predicted_income": estimasi total pemasukan bulan depan (integer, contoh: 7500000),
  "predicted_expense": estimasi total pengeluaran bulan depan (integer, contoh: 6200000),
  "risk_level": "LOW" atau "MEDIUM" atau "HIGH",
  "warnings": [
     "daftar peringatan dini atau saran spesifik untuk bulan depan..."
  ],
  "analysis_text": "narasi singkat analisis menyeluruh Anda mengenai perkiraan cash flow bulan depan."
}
      `;

      try {
        const result = await model.generateContent(prompt);
        const jsonText = result.response.text().trim();
        const cleanJsonText = jsonText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        const parsedData = JSON.parse(cleanJsonText);
        
        if (parsedData.warnings) {
          parsedData.warnings = parsedData.warnings.map(w => w.replace(/\*\*/g, ''));
        }
        if (parsedData.analysis_text) {
          parsedData.analysis_text = parsedData.analysis_text.replace(/\*\*/g, '');
        }

        // Cache hasil forecast selama 1 jam (3600 detik)
        await cacheEngine.set(cacheKey, parsedData, 3600);

        return res.json({ success: true, from_cache: false, data: parsedData });
      } catch (err) {
        console.warn('[AI] Gagal melakukan forecast dengan Gemini:', err.message);
        console.info('[AI] Menggunakan fallback forecast lokal.');
        const fallbackResult = simulateForecast(transactions, budgets);
        
        // Cache hasil fallback selama 10 menit (600 detik) untuk meredam pemanggilan bertubi-tubi saat error/limiter aktif
        await cacheEngine.set(cacheKey, fallbackResult, 600);
        
        return res.json({ success: true, from_cache: false, data: fallbackResult });
      }
    } catch (error) {
      next(error);
    }
  }
};

// Helper forecast lokal luring
function simulateForecast(transactions, budgets) {
  const incomes = transactions.filter(t => t.type === 'income').map(t => t.amount);
  const expenses = transactions.filter(t => t.type === 'expense').map(t => t.amount);

  const avgIncome = incomes.length > 0 ? incomes.reduce((a, b) => a + b, 0) / Math.max(1, incomes.length / 5) : 5000000;
  const avgExpense = expenses.length > 0 ? expenses.reduce((a, b) => a + b, 0) / Math.max(1, expenses.length / 5) : 4000000;

  const predictedIncome = Math.round(avgIncome * 1.05); // asumsikan naik 5%
  const predictedExpense = Math.round(avgExpense * 1.02); // asumsikan naik 2%

  const net = predictedIncome - predictedExpense;
  const riskLevel = net < 0 ? 'HIGH' : (net < 500000 ? 'MEDIUM' : 'LOW');

  const warnings = [
    'Pola historis menunjukkan pengeluaran Anda cenderung stabil, namun pastikan tetap mencatat pengeluaran kecil.',
    'Menjelang bulan depan, disarankan untuk membatasi pengeluaran non-primer agar level risiko tetap aman.'
  ];

  if (riskLevel === 'HIGH' || riskLevel === 'MEDIUM') {
    warnings.unshift('Waspada! Proyeksi arus kas Anda menunjukkan risiko defisit. Kurangi anggaran makan luar dan hiburan.');
  }

  return {
    predicted_income: predictedIncome,
    predicted_expense: predictedExpense,
    risk_level: riskLevel,
    warnings,
    analysis_text: 'Analisis luring memperkirakan pengeluaran Anda bulan depan akan sedikit meningkat. Disarankan memperketat pos anggaran non-esensial.'
  };
}

// Helper parsing struk lokal luring
function simulateReceiptParsing(categoriesList) {
  const randomAmount = Math.floor(Math.random() * (150000 - 35000 + 1)) + 35000;
  
  // Pilih kategori pengeluaran secara acak
  const expenseCategories = categoriesList.filter(c => c.type === 'expense').map(c => c.name);
  let category = 'Belanja Harian';
  if (expenseCategories.length > 0) {
    // Cari yang paling umum, atau pilih random
    if (expenseCategories.includes('Belanja Harian')) {
      category = 'Belanja Harian';
    } else if (expenseCategories.includes('Makanan & Minuman')) {
      category = 'Makanan & Minuman';
    } else {
      category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
    }
  }

  return {
    type: 'expense',
    amount: randomAmount,
    category,
    date: new Date().toISOString().split('T')[0],
    note: `Struk Belanja Toko Harian (Simulasi Offline)`
  };
}

// Helper parsing lokal luring
function simulateParsing(text, categoriesList) {
  const textLower = text.toLowerCase();
  
  let amount = 0;
  const numberMatches = textLower.match(/\d+[\d\.]*/g);
  if (numberMatches) {
    const rawNumberStr = numberMatches.reduce((a, b) => a.length > b.length ? a : b);
    const parsedNum = parseFloat(rawNumberStr.replace(/\./g, ''));
    if (!isNaN(parsedNum)) {
      amount = parsedNum;
    }
  }

  if (textLower.includes('rb') || textLower.includes('ribu')) {
    if (amount < 1000) amount = amount * 1000;
  }
  if (textLower.includes('jt') || textLower.includes('juta')) {
    if (amount < 1000000) amount = amount * 1000000;
  }

  let type = 'expense';
  if (textLower.includes('gaji') || textLower.includes('masuk') || textLower.includes('bonus') || textLower.includes('pemasukan') || textLower.includes('terima')) {
    type = 'income';
  }

  let note = text;
  note = note.replace(/\b\d+[\d\.]*(?:rb|ribu|jt|juta)?\b/gi, '').trim();
  note = note.replace(/\b(?:habis|bayar|beli|masuk|dapat|sebesar|nominal|rp)\b/gi, '').trim();
  if (!note) note = text;

  let category = 'Lain-lain';
  const categoryNames = categoriesList.filter(c => c.type === type).map(c => c.name);
  
  for (const cat of categoryNames) {
    const catWords = cat.toLowerCase().split(/[ &\/]/);
    for (const word of catWords) {
      if (word.length > 3 && textLower.includes(word)) {
        category = cat;
        break;
      }
    }
    if (category !== 'Lain-lain') break;
  }

  return {
    type,
    amount,
    category,
    date: new Date().toISOString().split('T')[0],
    note: note.slice(0, 50)
  };
}

export default AIController;
