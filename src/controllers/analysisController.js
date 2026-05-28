import TransactionModel from '../models/transactionModel.js';
import AnalyticsService from '../services/analyticsService.js';
import cacheEngine from '../utils/cache.js';

const AnalysisController = {
  /**
   * GET /api/analysis/summary
   */
  async getSummary(req, res, next) {
    try {
      const userId = req.user.id;
      const cacheKey = `analysis:${userId}:summary`;
      const cachedData = await cacheEngine.get(cacheKey);

      if (cachedData) {
        console.log(`[Cache Hit] Mengambil real-time balance summary dari cache untuk user ${userId}`);
        return res.json({
          success: true,
          from_cache: true,
          data: cachedData
        });
      }

      const summary = await TransactionModel.getSummary(userId);
      await cacheEngine.set(cacheKey, summary, 300);

      res.json({
        success: true,
        from_cache: false,
        data: summary
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/analysis/category
   */
  async getCategoryExpenses(req, res, next) {
    try {
      const userId = req.user.id;
      const cacheKey = `analysis:${userId}:category`;
      const cachedData = await cacheEngine.get(cacheKey);

      if (cachedData) {
        console.log(`[Cache Hit] Mengambil agregasi kategori dari cache untuk user ${userId}`);
        return res.json({
          success: true,
          from_cache: true,
          data: cachedData
        });
      }

      const categoryExpenses = await TransactionModel.getExpenseByCategoryForCurrentMonth(userId);
      await cacheEngine.set(cacheKey, categoryExpenses, 300);

      res.json({
        success: true,
        from_cache: false,
        data: categoryExpenses
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/analysis/budgets
   */
  async getBudgetForecasts(req, res, next) {
    try {
      const userId = req.user.id;
      const today = new Date();
      const month = req.query.month || (today.getMonth() + 1);
      const year = req.query.year || today.getFullYear();
      
      const cacheKey = `analysis:${userId}:budgets:${month}_${year}`;
      const cachedData = await cacheEngine.get(cacheKey);

      if (cachedData) {
        console.log(`[Cache Hit] Mengambil proyeksi anggaran ${month}/${year} dari cache untuk user ${userId}`);
        return res.json({
          success: true,
          from_cache: true,
          data: cachedData
        });
      }

      const forecast = await AnalyticsService.getBudgetProjections(userId, month, year);
      await cacheEngine.set(cacheKey, forecast, 300);

      res.json({
        success: true,
        from_cache: false,
        data: forecast
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/analysis/health
   */
  async getFinancialHealth(req, res, next) {
    try {
      const userId = req.user.id;
      const cacheKey = `analysis:${userId}:health`;
      const cachedData = await cacheEngine.get(cacheKey);

      if (cachedData) {
        console.log(`[Cache Hit] Mengambil Skor Kesehatan Finansial dari cache untuk user ${userId}`);
        return res.json({
          success: true,
          from_cache: true,
          data: cachedData
        });
      }

      const healthReport = await AnalyticsService.getFinancialHealthScore(userId);
      await cacheEngine.set(cacheKey, healthReport, 300);

      res.json({
        success: true,
        from_cache: false,
        data: healthReport
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/analysis/cashflow-trend
   */
  async getCashflowTrend(req, res, next) {
    try {
      const userId = req.user.id;
      const limitMonths = req.query.limit || 6;
      const cacheKey = `analysis:${userId}:cashflow-trend:${limitMonths}`;
      const cachedData = await cacheEngine.get(cacheKey);

      if (cachedData) {
        console.log(`[Cache Hit] Mengambil tren cashflow bulanan (${limitMonths} bulan) dari cache untuk user ${userId}`);
        return res.json({
          success: true,
          from_cache: true,
          data: cachedData
        });
      }

      const history = await TransactionModel.getMonthlyCashflowHistory(userId, limitMonths);
      await cacheEngine.set(cacheKey, history, 300);

      res.json({
        success: true,
        from_cache: false,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }
};

export default AnalysisController;
