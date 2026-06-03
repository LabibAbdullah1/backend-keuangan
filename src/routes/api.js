import express from 'express';
import validate from '../middlewares/validator.js';
import schemas from '../config/schemas.js';
import authMiddleware from '../middlewares/authMiddleware.js';

import TransactionController from '../controllers/transactionController.js';
import CategoryController from '../controllers/categoryController.js';
import BudgetController from '../controllers/budgetController.js';
import GoalController from '../controllers/goalController.js';
import AnalysisController from '../controllers/analysisController.js';
import RecurringController from '../controllers/recurringController.js';
import AuthController from '../controllers/authController.js';
import PartnershipController from '../controllers/partnershipController.js';
import CalculatorController from '../controllers/calculatorController.js';


const router = express.Router();

// ==========================================
// 1. SECURE CRON AUTOMATION ENDPOINT (Bebas JWT, dilindungi X-CRON-KEY)
// ==========================================
router.post('/cron/process-recurring', RecurringController.triggerCron);

// ==========================================
// AKTIFKAN PROTEKSI JWT UNTUK SELURUH RUTE DI BAWAH INI
// ==========================================
router.use(authMiddleware);

// ==========================================
// 2. RUTE TRANSAKSI (TRANSACTIONS)
// ==========================================
router.get('/transactions', TransactionController.getTransactions);
router.get('/transactions/:id', TransactionController.getTransactionById);
router.post('/transactions', validate(schemas.transactionSchema), TransactionController.createTransaction);
router.delete('/transactions/:id', TransactionController.deleteTransaction);

// ==========================================
// 2.5. RUTE KATEGORI (CATEGORIES)
// ==========================================
router.get('/categories', CategoryController.getCategories);
router.post('/categories', validate(schemas.createCategorySchema), CategoryController.createCategory);
router.put('/categories/:id', validate(schemas.updateCategorySchema), CategoryController.updateCategory);
router.delete('/categories/:id', CategoryController.deleteCategory);

// ==========================================
// 3. RUTE ANGGARAN (BUDGETS)
// ==========================================
router.get('/budgets', BudgetController.getBudgets);
router.post('/budgets', validate(schemas.budgetSchema), BudgetController.saveBudget);
router.delete('/budgets/:id', BudgetController.deleteBudget);

// ==========================================
// 4. RUTE TARGET TABUNGAN (SAVINGS GOALS)
// ==========================================
router.get('/goals', GoalController.getGoals);
router.get('/goals/:id', GoalController.getGoalById);
router.post('/goals', validate(schemas.goalSchema), GoalController.createGoal);
router.put('/goals/:id', validate(schemas.goalSchema), GoalController.updateGoal);
router.post('/goals/:id/contribute', validate(schemas.contributionSchema), GoalController.contributeToGoal);
router.delete('/goals/:id', GoalController.deleteGoal);

// ==========================================
// 5. RUTE TRANSAKSI BERKALA / RECURRING
// ==========================================
router.get('/recurring', RecurringController.getTemplates);
router.post('/recurring', validate(schemas.recurringSchema), RecurringController.createTemplate);
router.patch('/recurring/:id/toggle', RecurringController.toggleActive);
router.delete('/recurring/:id', RecurringController.deleteTemplate);

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

// ==========================================
// 7. RUTE PROFIL USER (USER PROFILE)
// ==========================================
router.put('/users/profile', validate(schemas.updateProfileSchema), AuthController.updateProfile);

// ==========================================
// 8. RUTE KEMITRAAN / KELOLA BERSAMA (PARTNERSHIPS)
// ==========================================
router.post('/partnership/invite', PartnershipController.invite);
router.get('/partnership/invites', PartnershipController.getInvites);
router.put('/partnership/accept/:id', PartnershipController.accept);
router.put('/partnership/reject/:id', PartnershipController.reject);
router.get('/partnership/active', PartnershipController.getActive);
router.delete('/partnership/disconnect', PartnershipController.disconnect);

// ==========================================
// 9. RUTE KALKULATOR KEUANGAN (FINANCIAL CALCULATORS)
// ==========================================
router.post('/calculators/budget-allocation', validate(schemas.budgetAllocationSchema), CalculatorController.getBudgetAllocation);
router.post('/calculators/savings-simulator', validate(schemas.savingsSimulatorSchema), CalculatorController.getSavingsProjection);
router.post('/calculators/emergency-fund', validate(schemas.emergencyFundSchema), CalculatorController.getEmergencyFundRecommendation);
router.post('/calculators/debt-payoff', validate(schemas.debtPayoffSchema), CalculatorController.getDebtPayoffStrategy);

export default router;

