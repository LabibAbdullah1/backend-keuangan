import BudgetModel from '../models/budgetModel.js';
import PartnershipModel from '../models/partnershipModel.js';
import cacheEngine from '../utils/cache.js';

const BudgetController = {
  /**
   * Mengambil semua daftar anggaran/limit bulanan (mendukung Mode Pasangan)
   */
  async getBudgets(req, res, next) {
    try {
      const userId = req.user.id;
      const { month, year, mode } = req.query;
      
      let partnerId = null;
      if (mode === 'couple') {
        const partner = await PartnershipModel.getActivePartner(userId);
        if (partner) {
          partnerId = partner.partner_id;
        }
      }

      const budgets = await BudgetModel.getAll(userId, month, year, partnerId);
      
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
      const userId = req.user.id;
      const budgetData = req.body;
      const result = await BudgetModel.upsert(userId, budgetData);
      
      // Kosongkan cache untuk pembuat
      await cacheEngine.deleteByPrefix(`analysis:${userId}:`);
      console.log(`[Cache Invalidation] Mengosongkan cache analisis user ${userId} karena anggaran diubah.`);

      // Kosongkan juga cache pasangan jika ada
      const partner = await PartnershipModel.getActivePartner(userId);
      if (partner) {
        await cacheEngine.deleteByPrefix(`analysis:${partner.partner_id}:`);
        console.log(`[Cache Invalidation] Mengosongkan cache analisis pasangan ${partner.partner_id} karena anggaran diubah.`);
      }

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
   * Menghapus alokasi anggaran kategori berdasarkan ID (mendukung saling percaya antar pasangan)
   */
  async deleteBudget(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { mode } = req.query;

      let partnerId = null;
      const partner = await PartnershipModel.getActivePartner(userId);
      if (partner) {
        partnerId = partner.partner_id;
      }

      const isDeleted = await BudgetModel.delete(id, userId, partnerId);
      
      if (!isDeleted) {
        return res.status(404).json({
          success: false,
          message: `Anggaran dengan ID ${id} tidak ditemukan.`
        });
      }

      // Kosongkan cache pembuat
      await cacheEngine.deleteByPrefix(`analysis:${userId}:`);

      // Kosongkan cache pasangan jika ada
      if (partnerId) {
        await cacheEngine.deleteByPrefix(`analysis:${partnerId}:`);
        console.log(`[Cache Invalidation] Mengosongkan cache analisis berdua (${userId} & ${partnerId}) karena anggaran dihapus.`);
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
