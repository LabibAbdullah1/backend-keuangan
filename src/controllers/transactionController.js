import TransactionModel from '../models/transactionModel.js';
import cacheEngine from '../utils/cache.js';

const TransactionController = {
  /**
   * Mengambil semua daftar transaksi dengan filter opsional
   */
  async getTransactions(req, res, next) {
    try {
      const { type, category, limit = 100, offset = 0 } = req.query;
      const transactions = await TransactionModel.getAll({ type, category, limit, offset });
      
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
      const { id } = req.params;
      const transaction = await TransactionModel.getById(id);
      
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
      const transactionData = req.body;
      const newTransaction = await TransactionModel.create(transactionData);
      
      // Mengosongkan seluruh cache analisis finansial karena data mutasi telah berubah
      await cacheEngine.deleteByPrefix('analysis:');
      console.log('[Cache Invalidation] Berhasil mengosongkan cache analisis karena transaksi baru ditambahkan.');

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
      const { id } = req.params;
      const isDeleted = await TransactionModel.delete(id);
      
      if (!isDeleted) {
        return res.status(404).json({
          success: false,
          message: `Gagal menghapus. Transaksi dengan ID ${id} tidak ditemukan.`
        });
      }

      // Mengosongkan seluruh cache analisis finansial karena data mutasi telah berubah
      await cacheEngine.deleteByPrefix('analysis:');
      console.log('[Cache Invalidation] Berhasil mengosongkan cache analisis karena transaksi dihapus.');

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
