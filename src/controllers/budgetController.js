import BudgetModel from '../models/budgetModel.js';

const BudgetController = {
  /**
   * Mengambil semua daftar anggaran/limit bulanan
   */
  async getBudgets(req, res, next) {
    try {
      const { month, year } = req.query;
      const budgets = await BudgetModel.getAll(month, year);
      
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
   * Membuat atau memperbarui (upsert) nominal batas anggaran kategori
   */
  async saveBudget(req, res, next) {
    try {
      const budgetData = req.body;
      const result = await BudgetModel.upsert(budgetData);
      
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
   * Menghapus alokasi anggaran kategori berdasarkan ID
   */
  async deleteBudget(req, res, next) {
    try {
      const { id } = req.params;
      const isDeleted = await BudgetModel.delete(id);
      
      if (!isDeleted) {
        return res.status(404).json({
          success: false,
          message: `Anggaran dengan ID ${id} tidak ditemukan.`
        });
      }

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
