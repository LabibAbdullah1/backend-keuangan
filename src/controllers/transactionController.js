import TransactionModel from '../models/transactionModel.js';
import cacheEngine from '../utils/cache.js';

const TransactionController = {
  /**
   * Mengambil semua daftar transaksi dengan filter opsional
   */
  async getTransactions(req, res, next) {
    try {
      const userId = req.user.id;
      const { type, category, limit = 100, offset = 0 } = req.query;
      const transactions = await TransactionModel.getAll(userId, { type, category, limit, offset });
      
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
   * Mengambil satu detail transaksi berdasarkan ID
   */
  async getTransactionById(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const transaction = await TransactionModel.getById(id, userId);
      
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
   * Menambahkan transaksi baru (Invalidasi cache analisis)
   */
  async createTransaction(req, res, next) {
    try {
      const userId = req.user.id;
      const transactionData = req.body;
      const newTransaction = await TransactionModel.create(userId, transactionData);
      
      // Mengosongkan seluruh cache analisis finansial user karena data mutasi telah berubah
      await cacheEngine.deleteByPrefix(`analysis:${userId}:`);
      console.log(`[Cache Invalidation] Berhasil mengosongkan cache analisis user ${userId} karena transaksi baru ditambahkan.`);

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
   * Menghapus transaksi berdasarkan ID (Invalidasi cache analisis)
   */
  async deleteTransaction(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const isDeleted = await TransactionModel.delete(id, userId);
      
      if (!isDeleted) {
        return res.status(404).json({
          success: false,
          message: `Gagal menghapus. Transaksi dengan ID ${id} tidak ditemukan.`
        });
      }

      // Mengosongkan seluruh cache analisis finansial user karena data mutasi telah berubah
      await cacheEngine.deleteByPrefix(`analysis:${userId}:`);
      console.log(`[Cache Invalidation] Berhasil mengosongkan cache analisis user ${userId} karena transaksi dihapus.`);

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
