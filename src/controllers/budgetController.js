import BudgetModel from '../models/budgetModel.js';
import cacheEngine from '../utils/cache.js';

const BudgetController = {
  /**
   * Mengambil semua daftar anggaran/limit bulanan untuk user tertentu
   */
  async getBudgets(req, res, next) {
    try {
      const userId = req.user.id;
      const { month, year } = req.query;
      const budgets = await BudgetModel.getAll(userId, month, year);
      
      res.json({
        success: true,
        count: budgets.length,
        data: budgets
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Membuat atau memperbarui (upsert) nominal batas anggaran kategori untuk user tertentu
   */
  async saveBudget(req, res, next) {
    try {
      const userId = req.user.id;
      const budgetData = req.body;
      const result = await BudgetModel.upsert(userId, budgetData);
      
      // Mengosongkan cache analisis user karena budget kategori diubah/ditambahkan
      await cacheEngine.deleteByPrefix(`analysis:${userId}:`);
      console.log(`[Cache Invalidation] Berhasil mengosongkan cache analisis user ${userId} karena anggaran bulanan diubah/di-upsert.`);

      res.json({
        success: true,
        message: 'Anggaran berhasil disimpan/diperbarui.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Menghapus alokasi anggaran kategori berdasarkan ID untuk user tertentu
   */
  async deleteBudget(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const isDeleted = await BudgetModel.delete(id, userId);
      
      if (!isDeleted) {
        return res.status(404).json({
          success: false,
          message: `Anggaran dengan ID ${id} tidak ditemukan.`
        });
      }

      // Mengosongkan cache analisis user karena budget kategori dihapus
      await cacheEngine.deleteByPrefix(`analysis:${userId}:`);
      console.log(`[Cache Invalidation] Berhasil mengosongkan cache analisis user ${userId} karena anggaran bulanan dihapus.`);

      res.json({
        success: true,
        message: 'Anggaran berhasil dinonaktifkan/dihapus.'
      });
    } catch (error) {
      next(error);
    }
  }
};

export default BudgetController;
