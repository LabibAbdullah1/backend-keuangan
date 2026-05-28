import GoalModel from '../models/goalModel.js';
import AnalyticsService from '../services/analyticsService.js';
import cacheEngine from '../utils/cache.js';

const GoalController = {
  /**
   * Mengambil semua daftar target tabungan beserta analisis progres (Dicache selama 5 menit)
   */
  async getGoals(req, res, next) {
    try {
      const cacheKey = 'goals:list';
      const cachedData = await cacheEngine.get(cacheKey);

      if (cachedData) {
        console.log('[Cache Hit] Mengambil analisis target tabungan dari cache');
        return res.json({
          success: true,
          from_cache: true,
          count: cachedData.length,
          data: cachedData
        });
      }

      const analyzedGoals = await AnalyticsService.getSavingsGoalsAnalysis();
      await cacheEngine.set(cacheKey, analyzedGoals, 300);

      res.json({
        success: true,
        from_cache: false,
        count: analyzedGoals.length,
        data: analyzedGoals
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Mengambil detail target tabungan
   */
  async getGoalById(req, res, next) {
    try {
      const { id } = req.params;
      const goal = await GoalModel.getById(id);
      
      if (!goal) {
        return res.status(404).json({
          success: false,
          message: `Target tabungan dengan ID ${id} tidak ditemukan.`
        });
      }

      res.json({
        success: true,
        data: goal
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Membuat target tabungan baru (Invalidasi cache goals & analisis)
   */
  async createGoal(req, res, next) {
    try {
      const goalData = req.body;
      const newGoal = await GoalModel.create(goalData);
      
      // Invalidate caches
      await cacheEngine.deleteByPrefix('goals:');
      await cacheEngine.deleteByPrefix('analysis:'); // Kesehatan keuangan bergantung pada goals
      console.log('[Cache Invalidation] Berhasil mengosongkan cache goals & analisis karena target baru ditambahkan.');

      res.status(201).json({
        success: true,
        message: 'Target tabungan berhasil ditambahkan.',
        data: newGoal
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Menambahkan alokasi kontribusi tabungan ke target tertentu (Invalidasi cache goals & analisis)
   */
  async contributeToGoal(req, res, next) {
    try {
      const { id } = req.params;
      const { amount } = req.body;

      const goal = await GoalModel.getById(id);
      if (!goal) {
        return res.status(404).json({
          success: false,
          message: `Target tabungan dengan ID ${id} tidak ditemukan.`
        });
      }

      const isUpdated = await GoalModel.addContribution(id, amount);
      if (!isUpdated) {
        return res.status(500).json({
          success: false,
          message: 'Gagal mengalokasikan tabungan. Silakan coba beberapa saat lagi.'
        });
      }

      // Invalidate caches
      await cacheEngine.deleteByPrefix('goals:');
      await cacheEngine.deleteByPrefix('analysis:');
      console.log('[Cache Invalidation] Berhasil mengosongkan cache goals & analisis karena kontribusi tabungan baru masuk.');

      const updatedGoal = await GoalModel.getById(id);
      
      res.json({
        success: true,
        message: `Kontribusi tabungan Rp ${amount.toLocaleString('id-ID')} berhasil disimpan.`,
        data: updatedGoal
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Memperbarui detail target tabungan (Invalidasi cache goals & analisis)
   */
  async updateGoal(req, res, next) {
    try {
      const { id } = req.params;
      const goalData = req.body;

      const goal = await GoalModel.getById(id);
      if (!goal) {
        return res.status(404).json({
          success: false,
          message: `Target tabungan dengan ID ${id} tidak ditemukan.`
        });
      }

      await GoalModel.update(id, goalData);
      
      // Invalidate caches
      await cacheEngine.deleteByPrefix('goals:');
      await cacheEngine.deleteByPrefix('analysis:');
      console.log('[Cache Invalidation] Berhasil mengosongkan cache goals & analisis karena target diperbarui.');

      const updatedGoal = await GoalModel.getById(id);

      res.json({
        success: true,
        message: 'Target tabungan berhasil diperbarui.',
        data: updatedGoal
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Menghapus target tabungan (Invalidasi cache goals & analisis)
   */
  async deleteGoal(req, res, next) {
    try {
      const { id } = req.params;
      const isDeleted = await GoalModel.delete(id);
      
      if (!isDeleted) {
        return res.status(404).json({
          success: false,
          message: `Target tabungan dengan ID ${id} tidak ditemukan.`
        });
      }

      // Invalidate caches
      await cacheEngine.deleteByPrefix('goals:');
      await cacheEngine.deleteByPrefix('analysis:');
      console.log('[Cache Invalidation] Berhasil mengosongkan cache goals & analisis karena target dihapus.');

      res.json({
        success: true,
        message: 'Target tabungan berhasil dihapus.'
      });
    } catch (error) {
      next(error);
    }
  }
};

export default GoalController;
