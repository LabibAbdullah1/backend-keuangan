import PartnershipModel from '../models/partnershipModel.js';

const PartnershipController = {
  /**
   * Mengirim undangan kemitraan ke pengguna lain
   */
  async invite(req, res, next) {
    try {
      const requesterId = req.user.id;
      const { partnerIdentifier } = req.body;

      if (!partnerIdentifier || !partnerIdentifier.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Username atau Email pasangan tidak boleh kosong.'
        });
      }

      // Cari user pasangan berdasarkan identifier
      const targetUser = await PartnershipModel.findUserByIdentifier(partnerIdentifier.trim());
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: `Pengguna dengan username atau email '${partnerIdentifier}' tidak ditemukan.`
        });
      }

      // Cegah mengundang diri sendiri
      if (targetUser.id === requesterId) {
        return res.status(400).json({
          success: false,
          message: 'Anda tidak dapat mengirimkan undangan kemitraan kepada diri sendiri.'
        });
      }

      const invitation = await PartnershipModel.sendInvite(requesterId, targetUser.id);
      
      res.status(201).json({
        success: true,
        message: `Undangan kemitraan berhasil dikirim ke '${targetUser.username}'.`,
        data: invitation
      });
    } catch (error) {
      // Tangani error khusus yang dilemparkan oleh model
      if (error.message.includes('terhubung') || error.message.includes('pending')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  },

  /**
   * Mendapatkan daftar undangan masuk yang berstatus pending
   */
  async getInvites(req, res, next) {
    try {
      const userId = req.user.id;
      const invites = await PartnershipModel.getPendingInvites(userId);
      
      res.json({
        success: true,
        data: invites
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Menerima undangan kemitraan
   */
  async accept(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const isAccepted = await PartnershipModel.acceptInvite(id, userId);
      if (!isAccepted) {
        return res.status(400).json({
          success: false,
          message: 'Gagal menerima undangan. Undangan tidak valid atau sudah diproses.'
        });
      }

      res.json({
        success: true,
        message: 'Selamat! Anda kini telah terhubung sebagai pasangan. Dashboard gabungan siap digunakan.'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Menolak undangan kemitraan
   */
  async reject(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const isRejected = await PartnershipModel.rejectInvite(id, userId);
      if (!isRejected) {
        return res.status(400).json({
          success: false,
          message: 'Gagal menolak undangan. Undangan tidak valid atau sudah diproses.'
        });
      }

      res.json({
        success: true,
        message: 'Undangan kemitraan berhasil ditolak.'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Mendapatkan informasi pasangan aktif saat ini
   */
  async getActive(req, res, next) {
    try {
      const userId = req.user.id;
      const partner = await PartnershipModel.getActivePartner(userId);
      
      res.json({
        success: true,
        data: partner
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Memutuskan hubungan kemitraan aktif
   */
  async disconnect(req, res, next) {
    try {
      const userId = req.user.id;
      const isDisconnected = await PartnershipModel.disconnect(userId);
      
      if (!isDisconnected) {
        return res.status(400).json({
          success: false,
          message: 'Gagal memutuskan hubungan. Anda belum terhubung dengan pasangan mana pun.'
        });
      }

      res.json({
        success: true,
        message: 'Hubungan kemitraan berhasil diputuskan. Anda kembali ke mode mandiri.'
      });
    } catch (error) {
      next(error);
    }
  }
};

export default PartnershipController;
