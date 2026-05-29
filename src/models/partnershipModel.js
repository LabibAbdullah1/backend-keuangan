import { pool } from '../config/db.js';

const PartnershipModel = {
  /**
   * Cari user berdasarkan username/email
   */
  async findUserByIdentifier(identifier) {
    const sql = 'SELECT id, username, email FROM users WHERE username = ? OR email = ?';
    const [rows] = await pool.execute(sql, [identifier, identifier]);
    return rows[0] || null;
  },

  /**
   * Kirim undangan kemitraan (kelola bersama pasangan)
   */
  async sendInvite(requesterId, receiverId) {
    // Periksa apakah sudah ada hubungan aktif/pending di antara keduanya (baik arah A->B atau B->A)
    const checkSql = `
      SELECT * FROM partnerships 
      WHERE (requester_id = ? AND receiver_id = ?) 
         OR (requester_id = ? AND receiver_id = ?)
    `;
    const [existing] = await pool.execute(checkSql, [requesterId, receiverId, receiverId, requesterId]);
    
    if (existing.length > 0) {
      const relation = existing[0];
      if (relation.status === 'accepted') {
        throw new Error('Anda sudah terhubung dengan pengguna ini sebagai pasangan.');
      }
      if (relation.status === 'pending') {
        if (relation.requester_id === requesterId) {
          throw new Error('Undangan Anda sebelumnya masih berstatus pending.');
        } else {
          throw new Error('Pengguna ini telah mengirimkan undangan kepada Anda. Periksa profil Anda untuk menerimanya.');
        }
      }
      // Jika status rejected, kita reset statusnya menjadi pending dan ubah requester ke pengirim baru
      const resetSql = 'UPDATE partnerships SET status = "pending", requester_id = ?, receiver_id = ? WHERE id = ?';
      await pool.execute(resetSql, [requesterId, receiverId, relation.id]);
      return { id: relation.id, requester_id: requesterId, receiver_id: receiverId, status: 'pending' };
    }

    const sql = 'INSERT INTO partnerships (requester_id, receiver_id, status) VALUES (?, ?, "pending")';
    const [result] = await pool.execute(sql, [requesterId, receiverId]);
    return {
      id: result.insertId,
      requester_id: requesterId,
      receiver_id: receiverId,
      status: 'pending'
    };
  },

  /**
   * Dapatkan semua undangan masuk yang berstatus pending
   */
  async getPendingInvites(userId) {
    const sql = `
      SELECT p.id, p.requester_id, u.username as requester_username, u.email as requester_email, p.created_at
      FROM partnerships p
      JOIN users u ON p.requester_id = u.id
      WHERE p.receiver_id = ? AND p.status = 'pending'
    `;
    const [rows] = await pool.execute(sql, [userId]);
    return rows;
  },

  /**
   * Terima undangan kemitraan
   */
  async acceptInvite(inviteId, receiverId) {
    const sql = 'UPDATE partnerships SET status = "accepted" WHERE id = ? AND receiver_id = ? AND status = "pending"';
    const [result] = await pool.execute(sql, [inviteId, receiverId]);
    return result.affectedRows > 0;
  },

  /**
   * Menolak undangan kemitraan
   */
  async rejectInvite(inviteId, receiverId) {
    const sql = 'UPDATE partnerships SET status = "rejected" WHERE id = ? AND receiver_id = ? AND status = "pending"';
    const [result] = await pool.execute(sql, [inviteId, receiverId]);
    return result.affectedRows > 0;
  },

  /**
   * Dapatkan data pasangan aktif
   */
  async getActivePartner(userId) {
    const sql = `
      SELECT p.id as partnership_id, 
             CASE WHEN p.requester_id = ? THEN p.receiver_id ELSE p.requester_id END as partner_id,
             u.username as partner_username,
             u.email as partner_email
      FROM partnerships p
      JOIN users u ON (CASE WHEN p.requester_id = ? THEN p.receiver_id ELSE p.requester_id END) = u.id
      WHERE (p.requester_id = ? OR p.receiver_id = ?) AND p.status = 'accepted'
    `;
    const [rows] = await pool.execute(sql, [userId, userId, userId, userId]);
    return rows[0] || null;
  },

  /**
   * Putuskan hubungan (Hapus baris partnership)
   */
  async disconnect(userId) {
    const sql = 'DELETE FROM partnerships WHERE (requester_id = ? OR receiver_id = ?) AND status = "accepted"';
    const [result] = await pool.execute(sql, [userId, userId]);
    return result.affectedRows > 0;
  }
};

export default PartnershipModel;
