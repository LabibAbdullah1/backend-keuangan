import TransactionModel from '../models/transactionModel.js';
import BudgetModel from '../models/budgetModel.js';
import GoalModel from '../models/goalModel.js';

const AnalyticsService = {
  /**
   * Menganalisis kepatuhan anggaran dan memproyeksikan pengeluaran bulanan
   */
  async getBudgetProjections(month, year) {
    const activeMonth = parseInt(month, 10);
    const activeYear = parseInt(year, 10);
    
    const budgets = await BudgetModel.getAll(activeMonth, activeYear);
    
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
        budget.category,
        activeMonth,
        activeYear
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
  async getSavingsGoalsAnalysis() {
    const goals = await GoalModel.getAll();
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
  async getFinancialHealthScore() {
    const summary = await TransactionModel.getSummary();
    const goals = await GoalModel.getAll();
    
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const budgetProjectionsObj = await this.getBudgetProjections(month, year);
    
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

    return {
      financial_health_score: score,
      grade,
      assessments: deductions.length > 0 ? deductions : ['Keuangan Anda dalam kondisi sangat prima! Pertahankan pola ini.']
    };
  }
};

export default AnalyticsService;
