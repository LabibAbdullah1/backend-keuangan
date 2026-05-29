import TransactionModel from '../models/transactionModel.js';
import PartnershipModel from '../models/partnershipModel.js';
import cacheEngine from '../utils/cache.js';

const TransactionController = {
  /**
   * Mengambil semua daftar transaksi dengan filter opsional (mendukung Mode Pasangan)
   */
  async getTransactions(req, res, next) {
    try {
      const userId = req.user.id;
      const { type, category, limit = 100, offset = 0, mode } = req.query;
      
      let partnerId = null;
      if (mode === 'couple') {
        const partner = await PartnershipModel.getActivePartner(userId);
        if (partner) {
          partnerId = partner.partner_id;
        }
      }

      const transactions = await TransactionModel.getAll(userId, { type, category, limit, offset, partnerId });
      
      res.json({
        success: true,
        count: transactions.length,
        data: transactions
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Mengambil satu detail transaksi berdasarkan ID (mendukung Mode Pasangan)
   */
  async getTransactionById(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { mode } = req.query;

      let partnerId = null;
      if (mode === 'couple') {
        const partner = await PartnershipModel.getActivePartner(userId);
        if (partner) {
          partnerId = partner.partner_id;
        }
      }

      const transaction = await TransactionModel.getById(id, userId, partnerId);
      
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: `Transaksi dengan ID ${id} tidak ditemukan.`
        });
      }

      res.json({
        success: true,
        data: transaction
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Menambahkan transaksi baru (Mendukung invalidasi cache berdua)
   */
  async createTransaction(req, res, next) {
    try {
      const userId = req.user.id;
      const transactionData = req.body;
      const newTransaction = await TransactionModel.create(userId, transactionData);
      
      // Kosongkan cache untuk pembuat
      await cacheEngine.deleteByPrefix(`analysis:${userId}:`);
      console.log(`[Cache Invalidation] Mengosongkan cache analisis user ${userId} karena transaksi baru.`);

      // Jika user sedang berpasangan, kosongkan juga cache pasangannya
      const partner = await PartnershipModel.getActivePartner(userId);
      if (partner) {
        await cacheEngine.deleteByPrefix(`analysis:${partner.partner_id}:`);
        console.log(`[Cache Invalidation] Mengosongkan cache analisis pasangan ${partner.partner_id} karena transaksi baru.`);
      }

      res.status(201).json({
        success: true,
        message: 'Transaksi berhasil ditambahkan.',
        data: newTransaction
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Menghapus transaksi berdasarkan ID (Mendukung saling percaya & invalidasi cache berdua)
   */
  async deleteTransaction(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { mode } = req.query;

      let partnerId = null;
      const partner = await PartnershipModel.getActivePartner(userId);
      if (partner) {
        partnerId = partner.partner_id;
      }

      const isDeleted = await TransactionModel.delete(id, userId, partnerId);
      
      if (!isDeleted) {
        return res.status(404).json({
          success: false,
          message: `Gagal menghapus. Transaksi dengan ID ${id} tidak ditemukan.`
        });
      }

      // Kosongkan cache analisis pembuat
      await cacheEngine.deleteByPrefix(`analysis:${userId}:`);

      // Kosongkan juga cache pasangan jika ada
      if (partnerId) {
        await cacheEngine.deleteByPrefix(`analysis:${partnerId}:`);
        console.log(`[Cache Invalidation] Mengosongkan cache analisis berdua (${userId} & ${partnerId}) karena transaksi dihapus.`);
      }

      res.json({
        success: true,
        message: 'Transaksi berhasil dihapus.'
      });
    } catch (error) {
      next(error);
    }
  }
};

export default TransactionController;
