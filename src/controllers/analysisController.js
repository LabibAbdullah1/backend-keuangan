import TransactionModel from '../models/transactionModel.js';
import AnalyticsService from '../services/analyticsService.js';

const AnalysisController = {
  /**
   * GET /api/analysis/summary
   * Menghitung total akumulasi Saldo Akhir saat ini (Total Pemasukan - Total Pengeluaran) secara real-time
   */
  async getSummary(req, res, next) {
    try {
      const summary = await TransactionModel.getSummary();
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/analysis/category
   * Mengelompokkan total pengeluaran berdasarkan kategori khusus bulan berjalan (SUM amount GROUP BY category WHERE type = 'expense')
   */
  async getCategoryExpenses(req, res, next) {
    try {
      const categoryExpenses = await TransactionModel.getExpenseByCategoryForCurrentMonth();
      
      res.json({
        success: true,
        data: categoryExpenses
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/analysis/budgets
   * Mengambil kepatuhan dan proyeksi laju penggunaan anggaran (Predictive Velocity)
   */
  async getBudgetForecasts(req, res, next) {
    try {
      const today = new Date();
      const month = req.query.month || (today.getMonth() + 1);
      const year = req.query.year || today.getFullYear();
      
      const forecast = await AnalyticsService.getBudgetProjections(month, year);
      
      res.json({
        success: true,
        data: forecast
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/analysis/health
   * Mengambil kalkulasi tingkat kesehatan finansial komprehensif
   */
  async getFinancialHealth(req, res, next) {
    try {
      const healthReport = await AnalyticsService.getFinancialHealthScore();
      
      res.json({
        success: true,
        data: healthReport
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/analysis/cashflow-trend
   * Tren kas bulanan untuk keperluan visualisasi grafik historis
   */
  async getCashflowTrend(req, res, next) {
    try {
      const limitMonths = req.query.limit || 6;
      const history = await TransactionModel.getMonthlyCashflowHistory(limitMonths);
      
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }
};

export default AnalysisController;
