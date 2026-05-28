import RecurringModel from '../models/recurringModel.js';
import RecurringService from '../services/recurringService.js';
import cacheEngine from '../utils/cache.js';

const RecurringController = {
  /**
   * Mengambil semua templat transaksi berulang
   */
  async getTemplates(req, res, next) {
    try {
      const templates = await RecurringModel.getAll();
      res.json({
        success: true,
        count: templates.length,
        data: templates
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Mendaftarkan rencana transaksi berulang baru (Subscription / Pemasukan rutin)
   */
  async createTemplate(req, res, next) {
    try {
      const templateData = req.body;
      const newTemplate = await RecurringModel.create(templateData);
      
      res.status(201).json({
        success: true,
        message: 'Templat transaksi berulang berhasil didaftarkan.',
        data: newTemplate
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Mengubah status aktif/nonaktif templat berulang
   */
  async toggleActive(req, res, next) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      if (typeof is_active !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'Parameter "is_active" harus berupa boolean (true/false).'
        });
      }

      const template = await RecurringModel.getById(id);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: `Templat dengan ID ${id} tidak ditemukan.`
        });
      }

      await RecurringModel.toggleActive(id, is_active);
      const updatedTemplate = await RecurringModel.getById(id);

      res.json({
        success: true,
        message: `Templat transaksi berulang berhasil ${is_active ? 'diaktifkan' : 'dinonaktifkan'}.`,
        data: updatedTemplate
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Menghapus templat transaksi berulang
   */
  async deleteTemplate(req, res, next) {
    try {
      const { id } = req.params;
      const isDeleted = await RecurringModel.delete(id);
      
      if (!isDeleted) {
        return res.status(404).json({
          success: false,
          message: `Templat dengan ID ${id} tidak ditemukan.`
        });
      }

      res.json({
        success: true,
        message: 'Templat transaksi berulang berhasil dihapus.'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Endpoint Cron yang aman dan ramah cPanel hosting (Phusion Passenger)
   */
  async triggerCron(req, res, next) {
    try {
      const clientKey = req.headers['x-cron-key'];
      const serverKey = process.env.CRON_SECURE_KEY;

      if (!clientKey || clientKey !== serverKey) {
        return res.status(401).json({
          success: false,
          message: 'Autentikasi Cron Gagal. Token X-CRON-KEY tidak valid atau kosong.'
        });
      }

      const processResult = await RecurringService.processDueRecurring();

      // Jika ada transaksi jatuh tempo yang diposting secara otomatis, kosongkan cache analisis
      if (processResult && processResult.processed_count > 0) {
        await cacheEngine.deleteByPrefix('analysis:');
        console.log(`[Cache Invalidation] Berhasil mengosongkan cache analisis karena ${processResult.processed_count} transaksi berulang berhasil diposting otomatis via Cron.`);
      }

      res.json({
        success: true,
        message: 'Automated recurring cron engine completed successfully.',
        timestamp: new Date().toISOString(),
        ...processResult
      });
    } catch (error) {
      next(error);
    }
  }
};

export default RecurringController;
