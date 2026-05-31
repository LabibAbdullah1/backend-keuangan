import { pool } from '../config/db.js';
import PartnershipModel from '../models/partnershipModel.js';
import GoalModel from '../models/goalModel.js';

const CalculatorService = {
  /**
   * 1. Kalkulator Alokasi Anggaran (Aturan 50/30/20)
   */
  async calculateBudgetAllocation(monthlyIncome) {
    const needs = parseFloat((monthlyIncome * 0.50).toFixed(2));
    const wants = parseFloat((monthlyIncome * 0.30).toFixed(2));
    const savings = parseFloat((monthlyIncome * 0.20).toFixed(2));

    return {
      monthly_income: monthlyIncome,
      allocations: {
        needs: {
          percentage: 50,
          amount: needs,
          description: 'Kebutuhan Pokok (Sewa rumah/kos, tagihan air/listrik, belanja dapur harian, transportasi, dan cicilan utang wajib).'
        },
        wants: {
          percentage: 30,
          amount: wants,
          description: 'Keinginan Pribadi (Makan di luar/kafe, hiburan/streaming, hobi, belanja baju, dan liburan).'
        },
        savings: {
          percentage: 20,
          amount: savings,
          description: 'Tabungan & Investasi (Dana darurat, investasi reksadana/emas/saham, tabungan berjangka, dan pelunasan utang ekstra).'
        }
      },
      tips: [
        'Prioritaskan pemotongan porsi Tabungan (20%) secara otomatis begitu Anda menerima gaji (Auto-debet/Pay yourself first).',
        'Gunakan porsi 50% Kebutuhan Pokok untuk menjaga kebutuhan dasar hidup Anda tetap terpenuhi dengan aman.',
        'Jika alokasi Keinginan (30%) bersisa di akhir bulan, alihkan sisanya langsung ke rekening Tabungan atau Dana Darurat.'
      ]
    };
  },

  /**
   * 2. Kalkulator Proyeksi Tabungan & Bunga Bergulung (Compound Interest)
   */
  async calculateSavingsProjection(data) {
    const { target_amount, current_amount = 0, duration_months, monthly_contribution, annual_interest_rate = 0 } = data;

    const monthlyInterestRate = (annual_interest_rate / 12) / 100;
    const remainingTarget = target_amount - current_amount;

    if (remainingTarget <= 0) {
      return {
        target_amount,
        current_amount,
        duration_months: 0,
        monthly_contribution: 0,
        annual_interest_rate,
        total_interest_earned: 0,
        total_principal: current_amount,
        total_accumulated: current_amount,
        projection_schedule: []
      };
    }

    let schedule = [];
    let calculatedMonthlyContribution = monthly_contribution || 0;
    let calculatedDuration = duration_months || 0;

    // Path A: Durasi diberikan, hitung kontribusi bulanan yang dibutuhkan
    if (duration_months && !monthly_contribution) {
      if (monthlyInterestRate === 0) {
        calculatedMonthlyContribution = remainingTarget / duration_months;
      } else {
        const fvCurrent = current_amount * Math.pow(1 + monthlyInterestRate, duration_months);
        if (fvCurrent >= target_amount) {
          calculatedMonthlyContribution = 0;
        } else {
          const remainingFv = target_amount - fvCurrent;
          const annuityFactor = (Math.pow(1 + monthlyInterestRate, duration_months) - 1) / monthlyInterestRate;
          calculatedMonthlyContribution = remainingFv / annuityFactor;
        }
      }
      calculatedMonthlyContribution = parseFloat(calculatedMonthlyContribution.toFixed(2));
    }

    // Jalankan simulasi bulan demi bulan untuk menyusun amortisasi & durasi
    let currentBalance = current_amount;
    let totalInterest = 0;
    let totalPrincipal = current_amount;
    let month = 0;

    const pmt = calculatedMonthlyContribution;
    const maxMonths = duration_months || 600; // Batasi maksimal 50 tahun demi keamanan loop

    while (currentBalance < target_amount && month < maxMonths) {
      month++;
      const interest = currentBalance * monthlyInterestRate;
      totalInterest += interest;
      totalPrincipal += pmt;
      currentBalance = currentBalance + interest + pmt;

      // Batasi array jadwal amortisasi maksimal 120 bulan agar payload respons tidak terlalu besar
      if (month <= 120) {
        schedule.push({
          month,
          principal_saved: parseFloat(totalPrincipal.toFixed(2)),
          interest_earned: parseFloat(totalInterest.toFixed(2)),
          balance: parseFloat(currentBalance.toFixed(2))
        });
      }
    }

    if (!duration_months) {
      calculatedDuration = month;
    }

    return {
      target_amount: parseFloat(target_amount.toFixed(2)),
      current_amount: parseFloat(current_amount.toFixed(2)),
      duration_months: calculatedDuration,
      monthly_contribution: calculatedMonthlyContribution,
      annual_interest_rate,
      total_interest_earned: parseFloat(totalInterest.toFixed(2)),
      total_principal: parseFloat(totalPrincipal.toFixed(2)),
      total_accumulated: parseFloat(currentBalance.toFixed(2)),
      projection_schedule: schedule
    };
  },

  /**
   * 3. Kalkulator Dana Darurat (Emergency Fund)
   */
  async calculateEmergencyFund(userId, data) {
    const { monthly_expense, marital_status = 'single', dependents_count = 0, include_partner = false } = data;

    let userIds = [userId];
    let partner = null;

    if (include_partner) {
      partner = await PartnershipModel.getActivePartner(userId);
      if (partner) {
        userIds.push(partner.partner_id);
      }
    }

    let finalMonthlyExpense = monthly_expense;
    let source = 'manual_input';

    // Jika tidak ada input pengeluaran bulanan, hitung otomatis rata-rata pengeluaran 3 bulan terakhir dari DB
    if (!finalMonthlyExpense) {
      const sql = `
        SELECT SUM(amount) as total_expense
        FROM transactions
        WHERE user_id IN (?)
          AND type = 'expense'
          AND date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
      `;
      const [rows] = await pool.query(sql, [userIds]);
      const totalExpense = parseFloat(rows[0].total_expense || 0);
      finalMonthlyExpense = parseFloat((totalExpense / 3).toFixed(2));
      source = 'database_average_90_days';
    }

    // Aturan Pengali (Multiplier): Lajang = 6x, Menikah = 9x, +1x per anak (Maksimal 12x)
    let multiplier = marital_status === 'married' ? 9 : 6;
    multiplier += dependents_count;
    if (multiplier > 12) multiplier = 12;

    const targetEmergencyFund = parseFloat((finalMonthlyExpense * multiplier).toFixed(2));

    // Ambil data goal tabungan aktif untuk melacak progres dana darurat riil pengguna
    let currentSavings = 0;
    let emergencyGoalName = null;

    const goals = await GoalModel.getAll(userId, partner ? partner.partner_id : null);
    const emergencyGoal = goals.find(g =>
      g.name.toLowerCase().includes('darurat') ||
      g.name.toLowerCase().includes('emergency')
    );

    if (emergencyGoal) {
      currentSavings = emergencyGoal.current_amount;
      emergencyGoalName = emergencyGoal.name;
    }

    const remainingToTarget = Math.max(0, targetEmergencyFund - currentSavings);
    const progressPercentage = targetEmergencyFund > 0
      ? parseFloat(((currentSavings / targetEmergencyFund) * 100).toFixed(2))
      : 0;

    return {
      calculated_monthly_expense: finalMonthlyExpense,
      source,
      marital_status,
      dependents_count,
      multiplier,
      target_emergency_fund: targetEmergencyFund,
      current_savings: currentSavings,
      emergency_goal_name: emergencyGoalName,
      remaining_to_target: parseFloat(remainingToTarget.toFixed(2)),
      progress_percentage: progressPercentage,
      partner_included: !!partner,
      recommendations: [
        `Berdasarkan status Anda, disarankan memiliki dana darurat sebesar ${multiplier} kali pengeluaran bulanan.`,
        `Dana darurat sebaiknya disimpan di tempat yang sangat likuid dan bebas risiko (seperti tabungan bank konvensional atau Reksadana Pasar Uang).`,
        `Fokus mengumpulkan dana darurat ini terlebih dahulu sebelum Anda melakukan investasi agresif di instrumen berisiko tinggi.`
      ]
    };
  },

  /**
   * 4. Kalkulator Pelunasan Utang (Snowball vs Avalanche)
   */
  async calculateDebtPayoff(data) {
    const { debts, extra_monthly_payment = 0 } = data;

    const snowballResult = this._simulateDebtPayoffStrategy(debts, extra_monthly_payment, 'snowball');
    const avalancheResult = this._simulateDebtPayoffStrategy(debts, extra_monthly_payment, 'avalanche');

    // Bandingkan untuk merekomendasikan opsi terbaik
    const interestSaved = parseFloat((snowballResult.total_interest_paid - avalancheResult.total_interest_paid).toFixed(2));
    const monthsSaved = snowballResult.months_to_payoff - avalancheResult.months_to_payoff;

    let recommendation = 'Metode Debt Avalanche direkomendasikan karena menghemat biaya bunga paling banyak.';
    if (interestSaved === 0) {
      recommendation = 'Kedua metode menghasilkan biaya bunga yang sama. Metode Debt Snowball direkomendasikan untuk motivasi psikologis yang lebih cepat.';
    }

    return {
      extra_monthly_payment,
      strategies: {
        snowball: snowballResult,
        avalanche: avalancheResult
      },
      comparison: {
        interest_saved_by_avalanche: Math.max(0, interestSaved),
        months_saved_by_avalanche: Math.max(0, monthsSaved),
        recommendation
      }
    };
  },

  /**
   * Helper internal untuk simulasi pembayaran utang
   */
  _simulateDebtPayoffStrategy(debtsList, extraPayment, strategyType) {
    // Salin objek agar tidak merusak data input asli
    let debts = debtsList.map(d => ({
      name: d.name,
      balance: d.balance,
      interest_rate: d.interest_rate,
      minimum_payment: d.minimum_payment,
      total_paid: 0,
      total_interest: 0
    }));

    let months = 0;
    let totalInterestPaid = 0;
    let totalAmountPaid = 0;
    let payoffOrder = [];
    let timeline = [];

    const maxMonths = 360; // Batasi maksimal 30 tahun demi keamanan

    while (debts.some(d => d.balance > 0) && months < maxMonths) {
      months++;

      let activeDebts = debts.filter(d => d.balance > 0);

      // Urutkan utang berdasarkan strategi pilihan
      if (strategyType === 'snowball') {
        // Snowball: Saldo terkecil ke terbesar
        activeDebts.sort((a, b) => a.balance - b.balance);
      } else {
        // Avalanche: Suku bunga terbesar ke terkecil
        activeDebts.sort((a, b) => b.interest_rate - a.interest_rate);
      }

      // 1. Tambahkan akumulasi bunga bulanan ke masing-masing utang yang aktif
      for (let d of debts) {
        if (d.balance > 0) {
          const monthlyInterest = d.balance * (d.interest_rate / 100 / 12);
          d.balance += monthlyInterest;
          d.total_interest += monthlyInterest;
          totalInterestPaid += monthlyInterest;
        }
      }

      // Tentukan anggaran bulanan: cicilan minimum utang aktif + dana ekstra
      const sumActiveMinimums = activeDebts.reduce((sum, d) => sum + d.minimum_payment, 0);
      let availableBudget = sumActiveMinimums + extraPayment;

      let paymentsThisMonth = {};

      // Tahap 1: Bayar cicilan minimum wajib untuk setiap utang aktif
      for (let d of activeDebts) {
        const payment = Math.min(d.balance, d.minimum_payment);
        d.balance -= payment;
        d.total_paid += payment;
        availableBudget -= payment;
        paymentsThisMonth[d.name] = payment;

        if (d.balance === 0 && !payoffOrder.includes(d.name)) {
          payoffOrder.push(d.name);
        }
      }

      // Tahap 2: Alokasikan sisa anggaran belanja (leftover minimum + extra) ke utang prioritas teratas
      if (availableBudget > 0) {
        for (let d of activeDebts) {
          if (d.balance > 0) {
            const extraPay = Math.min(d.balance, availableBudget);
            d.balance -= extraPay;
            d.total_paid += extraPay;
            availableBudget -= extraPay;
            paymentsThisMonth[d.name] = (paymentsThisMonth[d.name] || 0) + extraPay;

            if (d.balance === 0 && !payoffOrder.includes(d.name)) {
              payoffOrder.push(d.name);
            }

            if (availableBudget <= 0) break;
          }
        }
      }

      // Catat total pembayaran bulan berjalan
      const monthlyTotalPaid = Object.values(paymentsThisMonth).reduce((a, b) => a + b, 0);
      totalAmountPaid += monthlyTotalPaid;

      // Batasi catatan lini masa mendetail maksimal 60 bulan (5 tahun pertama) agar respon tidak terlalu panjang
      if (months <= 60) {
        timeline.push({
          month: months,
          remaining_debts: debts.map(d => ({ name: d.name, balance: parseFloat(d.balance.toFixed(2)) })),
          amount_paid: parseFloat(monthlyTotalPaid.toFixed(2))
        });
      }
    }

    return {
      strategy: strategyType,
      months_to_payoff: months,
      total_interest_paid: parseFloat(totalInterestPaid.toFixed(2)),
      total_amount_paid: parseFloat(totalAmountPaid.toFixed(2)),
      payoff_order: payoffOrder,
      timeline: timeline
    };
  }
};

export default CalculatorService;
