import TransactionModel from '../models/transactionModel.js';
import BudgetModel from '../models/budgetModel.js';
import GoalModel from '../models/goalModel.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const AnalyticsService = {
  /**
   * Menganalisis kepatuhan anggaran dan memproyeksikan pengeluaran bulanan
   */
  async getBudgetProjections(userId, month, year, partnerId = null) {
    const activeMonth = parseInt(month, 10);
    const activeYear = parseInt(year, 10);

    const budgets = await BudgetModel.getAll(userId, activeMonth, activeYear, partnerId);

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const currentDate = today.getDate();

    const isCurrentMonth = (activeMonth === currentMonth && activeYear === currentYear);

    const totalDaysInMonth = new Date(activeYear, activeMonth, 0).getDate();
    const daysPassed = isCurrentMonth ? currentDate : totalDaysInMonth;

    const projections = [];

    for (const budget of budgets) {
      const totalSpent = await TransactionModel.getCategorySpendingForMonth(
        userId,
        budget.category,
        activeMonth,
        activeYear,
        partnerId
      );

      const remainingBudget = budget.amount - totalSpent;
      const percentageSpent = budget.amount > 0 ? (totalSpent / budget.amount) * 100 : 0;

      const dailyBurnRate = daysPassed > 0 ? totalSpent / daysPassed : 0;

      const projectedSpending = isCurrentMonth
        ? dailyBurnRate * totalDaysInMonth
        : totalSpent;

      const isOverspent = totalSpent > budget.amount;
      const willOverspend = projectedSpending > budget.amount;

      let status = 'ON_TRACK';
      let estimatedExhaustionDay = null;

      if (isOverspent) {
        status = 'OVERSPENT';
      } else if (willOverspend) {
        status = 'HIGH_RISK';
        if (dailyBurnRate > 0) {
          estimatedExhaustionDay = Math.min(
            totalDaysInMonth,
            Math.max(1, Math.floor(budget.amount / dailyBurnRate))
          );
        }
      }

      projections.push({
        id: budget.id,
        category: budget.category,
        budget_limit: budget.amount,
        total_spent: totalSpent,
        remaining_budget: Math.max(0, remainingBudget),
        percentage_spent: parseFloat(percentageSpent.toFixed(2)),
        daily_burn_rate: parseFloat(dailyBurnRate.toFixed(2)),
        projected_spending: parseFloat(projectedSpending.toFixed(2)),
        status,
        estimated_exhaustion_day: estimatedExhaustionDay,
        is_current_month: isCurrentMonth
      });
    }

    return {
      month: activeMonth,
      year: activeYear,
      days_passed: daysPassed,
      total_days: totalDaysInMonth,
      projections
    };
  },

  /**
   * Menganalisis target tabungan, persentase progres, dan kalkulasi alokasi bulanan wajib
   */
  async getSavingsGoalsAnalysis(userId) {
    const goals = await GoalModel.getAll(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const analyzedGoals = goals.map(goal => {
      const targetDate = new Date(goal.target_date);
      targetDate.setHours(0, 0, 0, 0);

      const remainingAmount = Math.max(0, goal.target_amount - goal.current_amount);
      const progressPercentage = goal.target_amount > 0
        ? (goal.current_amount / goal.target_amount) * 100
        : 0;

      const msDiff = targetDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

      const monthsRemaining = daysRemaining > 0 ? daysRemaining / 30.44 : 0;

      let requiredMonthlySavings = 0;
      let status = 'ACTIVE';

      if (goal.current_amount >= goal.target_amount) {
        status = 'COMPLETED';
      } else if (daysRemaining <= 0) {
        status = 'BEHIND';
      } else {
        requiredMonthlySavings = remainingAmount / Math.max(0.1, monthsRemaining);
      }

      return {
        id: goal.id,
        name: goal.name,
        target_amount: goal.target_amount,
        current_amount: goal.current_amount,
        remaining_amount: parseFloat(remainingAmount.toFixed(2)),
        progress_percentage: parseFloat(progressPercentage.toFixed(2)),
        target_date: goal.target_date,
        days_remaining: Math.max(0, daysRemaining),
        months_remaining: parseFloat(monthsRemaining.toFixed(2)),
        required_monthly_savings: parseFloat(requiredMonthlySavings.toFixed(2)),
        status
      };
    });

    return analyzedGoals;
  },

  /**
   * Mendapatkan Skor Kesehatan Finansial (Financial Health Score) gabungan
   */
  async getFinancialHealthScore(userId, partnerId = null) {
    const summary = await TransactionModel.getSummary(userId, partnerId);
    const goals = await GoalModel.getAll(userId, partnerId);

    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const budgetProjectionsObj = await this.getBudgetProjections(userId, month, year, partnerId);

    let score = 100;
    const deductions = [];

    if (summary.total_income > 0) {
      const expenseRatio = (summary.total_expense / summary.total_income) * 100;
      if (expenseRatio > 90) {
        score -= 25;
        deductions.push('Rasio pengeluaran sangat tinggi (>90% dari pemasukan).');
      } else if (expenseRatio > 70) {
        score -= 15;
        deductions.push('Pengeluaran melebihi batas ideal 70% dari pemasukan.');
      }
    } else if (summary.total_expense > 0) {
      score -= 30;
      deductions.push('Memiliki pengeluaran namun tidak ada riwayat pemasukan tercatat.');
    }

    const overspentCategories = budgetProjectionsObj.projections.filter(p => p.status === 'OVERSPENT');
    const highRiskCategories = budgetProjectionsObj.projections.filter(p => p.status === 'HIGH_RISK');

    if (overspentCategories.length > 0) {
      const points = Math.min(20, overspentCategories.length * 8);
      score -= points;
      deductions.push(`Anggaran jebol di ${overspentCategories.length} kategori.`);
    }
    if (highRiskCategories.length > 0) {
      const points = Math.min(10, highRiskCategories.length * 4);
      score -= points;
      deductions.push(`Berisiko tinggi overspend di ${highRiskCategories.length} kategori.`);
    }

    const behindGoals = goals.filter(g => {
      const targetDate = new Date(g.target_date);
      return g.current_amount < g.target_amount && targetDate.getTime() < today.getTime();
    });

    if (behindGoals.length > 0) {
      score -= 15;
      deductions.push(`Memiliki ${behindGoals.length} target tabungan yang melewati deadline.`);
    }
    if (goals.length === 0) {
      score -= 10;
      deductions.push('Belum menetapkan target tabungan aktif.');
    }

    score = Math.max(0, Math.min(100, score));

    let grade = 'Sangat Sehat (Excellent)';
    if (score < 50) grade = 'Kurang Sehat (Poor)';
    else if (score < 70) grade = 'Cukup Sehat (Fair)';
    else if (score < 90) grade = 'Sehat (Good)';

    const baseAssessments = deductions.length > 0 ? deductions : ['Keuangan Anda dalam kondisi sangat prima! Pertahankan pola ini.'];

    // ── INTEGRASI GEMINI AI DETEKSI ANOMALI & KESEHATAN PERSONAL ──
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim() !== '') {
      try {
        const recentTransactions = await TransactionModel.getAll(userId, { limit: 150, partnerId });
        
        const financialContext = {
          baseScore: score,
          baseAssessments: baseAssessments,
          summary: {
            balance: summary.balance,
            total_income: summary.total_income,
            total_expense: summary.total_expense
          },
          budgets: budgetProjectionsObj.projections.map(p => ({
            category: p.category,
            limit: p.budget_limit,
            spent: p.total_spent,
            status: p.status
          })),
          goals: goals.map(g => ({
            name: g.name,
            target: g.target_amount,
            current: g.current_amount,
            deadline: g.target_date
          })),
          recentTransactions: recentTransactions.map(t => ({
            type: t.type,
            amount: t.amount,
            category: t.category,
            date: t.date,
            note: t.note
          }))
        };

        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const prompt = `
Anda adalah KeuanganKu AI, analis keuangan pribadi profesional. Tugas Anda adalah melakukan analisis mendalam mengenai kesehatan keuangan pengguna, mendeteksi kebiasaan tidak wajar (anomali) dari daftar transaksi terbaru mereka, serta memberikan rekomendasi personal.

Berikut adalah data keuangan pengguna saat ini:
${JSON.stringify(financialContext, null, 2)}

Analisis daftar transaksi di atas secara mendalam untuk mendeteksi:
1. Anomali pengeluaran (misalnya peningkatan mendadak biaya langganan, makan luar rumah yang tidak terkontrol, pengeluaran impulsif, pengeluaran berulang ganda, dll).
2. Tuliskan rekomendasi kesehatan keuangan yang ramah, suportif, dan personal (maksimal 4 rekomendasi utama) dalam bahasa Indonesia.
3. PENTING: Jangan gunakan format Markdown tebal seperti asterisks (**) dalam respon Anda. Ketik semua tulisan sebagai teks polos biasa tanpa simbol format bold/tebal Markdown.

Kembalikan respon hanya berupa JSON string murni (tanpa block code markdown, tanpa tambahan penjelasan) dengan skema berikut:
{
  "financial_health_score": angka integer 0-100 (beri bobot/penyesuaian berdasarkan anomali atau pencapaian yang Anda temukan),
  "grade": rating/kategori kesehatan keuangan (contoh: "Sangat Sehat (Excellent)", "Sehat (Good)", "Cukup Sehat (Fair)", atau "Kurang Sehat (Poor)"),
  "assessments": [
     "daftar rekomendasi terperinci dan ramah...",
     "termasuk pendeteksian anomali atau pola tidak wajar yang Anda temukan secara spesifik..."
  ]
}
        `;

        const result = await model.generateContent(prompt);
        const jsonText = result.response.text().trim();
        const cleanJsonText = jsonText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        const parsedData = JSON.parse(cleanJsonText);
        
        if (parsedData.assessments) {
          parsedData.assessments = parsedData.assessments.map(a => a.replace(/\*\*/g, ''));
        }

        return {
          financial_health_score: parsedData.financial_health_score ?? score,
          grade: parsedData.grade ?? grade,
          assessments: parsedData.assessments ?? baseAssessments
        };
      } catch (geminiError) {
        console.warn('[AI Health Analysis] Gagal menggunakan Gemini untuk analisis kesehatan keuangan:', geminiError.message);
        // Fallback otomatis ke static logic di bawah
      }
    }

    return {
      financial_health_score: score,
      grade,
      assessments: baseAssessments
    };
  }
};

export default AnalyticsService;
