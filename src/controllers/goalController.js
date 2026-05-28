import GoalModel from '../models/goalModel.js';
import AnalyticsService from '../services/analyticsService.js';

const GoalController = {
  /**
   * Mengambil semua daftar target tabungan beserta analisis progres dan alokasi bulanan wajibnya
   */
  async getGoals(req, res, next) {
    try {
      const analyzedGoals = await AnalyticsService.getSavingsGoalsAnalysis();
      
      res.json({
        success: true,
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
   * Membuat target tabungan baru
   */
  async createGoal(req, res, next) {
    try {
      const goalData = req.body;
      const newGoal = await GoalModel.create(goalData);
      
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
   * Menambahkan alokasi kontribusi tabungan ke target tertentu
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
   * Memperbarui detail target tabungan
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
   * Menghapus target tabungan
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
