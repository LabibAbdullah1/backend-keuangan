import express from 'express';
import validate from '../middlewares/validator.js';
import schemas from '../config/schemas.js';

import TransactionController from '../controllers/transactionController.js';
import BudgetController from '../controllers/budgetController.js';
import GoalController from '../controllers/goalController.js';
import AnalysisController from '../controllers/analysisController.js';
import RecurringController from '../controllers/recurringController.js';

const router = express.Router();

// ==========================================
// 1. RUTE TRANSAKSI (TRANSACTIONS)
// ==========================================
router.get('/transactions', TransactionController.getTransactions);
router.get('/transactions/:id', TransactionController.getTransactionById);
router.post('/transactions', validate(schemas.transactionSchema), TransactionController.createTransaction);
router.delete('/transactions/:id', TransactionController.deleteTransaction);

// ==========================================
// 2. RUTE ANGGARAN (BUDGETS)
// ==========================================
router.get('/budgets', BudgetController.getBudgets);
router.post('/budgets', validate(schemas.budgetSchema), BudgetController.saveBudget);
router.delete('/budgets/:id', BudgetController.deleteBudget);

// ==========================================
// 3. RUTE TARGET TABUNGAN (SAVINGS GOALS)
// ==========================================
router.get('/goals', GoalController.getGoals);
router.get('/goals/:id', GoalController.getGoalById);
router.post('/goals', validate(schemas.goalSchema), GoalController.createGoal);
router.put('/goals/:id', validate(schemas.goalSchema), GoalController.updateGoal);
router.post('/goals/:id/contribute', validate(schemas.contributionSchema), GoalController.contributeToGoal);
router.delete('/goals/:id', GoalController.deleteGoal);

// ==========================================
// 4. RUTE TRANSAKSI BERKALA / RECURRING
// ==========================================
router.get('/recurring', RecurringController.getTemplates);
router.post('/recurring', validate(schemas.recurringSchema), RecurringController.createTemplate);
router.patch('/recurring/:id/toggle', RecurringController.toggleActive);
router.delete('/recurring/:id', RecurringController.deleteTemplate);

// ==========================================
// 5. SECURE CRON AUTOMATION ENDPOINT
// ==========================================
router.post('/cron/process-recurring', RecurringController.triggerCron);

// ==========================================
// 6. RUTE ANALISIS & PROYEKSI (ANALYTICS)
// ==========================================
// Mengambil total akumulasi Saldo Akhir saat ini (Total Pemasukan - Total Pengeluaran) secara real-time
router.get('/analysis/summary', AnalysisController.getSummary);

// Mengelompokkan total pengeluaran berdasarkan kategori khusus bulan berjalan
router.get('/analysis/category', AnalysisController.getCategoryExpenses);

// Proyeksi kepatuhan anggaran & estimasi hari jebolnya budget
router.get('/analysis/budgets', AnalysisController.getBudgetForecasts);

// Mengambil kalkulasi tingkat kesehatan finansial komprehensif
router.get('/analysis/health', AnalysisController.getFinancialHealth);

// Histori cashflow bulanan (Grafik/Charts)
router.get('/analysis/cashflow-trend', AnalysisController.getCashflowTrend);

export default router;
