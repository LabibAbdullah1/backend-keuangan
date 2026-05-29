import { pool } from '../config/db.js';

const RecurringModel = {
  /**
   * Mengambil semua templat transaksi berulang (mendukung Mode Pasangan)
   */
  async getAll(userId, partnerId = null) {
    const userIds = partnerId ? [userId, partnerId] : [userId];
    const sql = `
      SELECT r.id, r.type, r.amount, r.category, r.frequency, r.note, DATE_FORMAT(r.next_due_date, "%Y-%m-%d") as next_due_date, r.is_active, r.created_at, u.username as creator_name 
      FROM recurring_templates r
      JOIN users u ON r.user_id = u.id
      WHERE r.user_id IN (?) 
      ORDER BY r.next_due_date ASC
    `;
    const [rows] = await pool.query(sql, [userIds]);
    return rows.map(row => ({
      ...row,
      amount: parseFloat(row.amount || 0),
      is_active: Boolean(row.is_active)
    }));
  },

  /**
   * Mengambil templat transaksi berulang berdasarkan ID (mendukung Mode Pasangan)
   */
  async getById(id, userId, partnerId = null) {
    const userIds = partnerId ? [userId, partnerId] : [userId];
    const sql = `
      SELECT r.id, r.type, r.amount, r.category, r.frequency, r.note, DATE_FORMAT(r.next_due_date, "%Y-%m-%d") as next_due_date, r.is_active, r.created_at, u.username as creator_name 
      FROM recurring_templates r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ? AND r.user_id IN (?)
    `;
    const [rows] = await pool.query(sql, [id, userIds]);
    if (rows[0]) {
      rows[0].amount = parseFloat(rows[0].amount || 0);
      rows[0].is_active = Boolean(rows[0].is_active);
      return rows[0];
    }
    return null;
  },

  /**
   * Mengambil seluruh templat yang jatuh tempo dan aktif secara global (Untuk background Cron)
   */
  async getDueTemplates(dateString) {
    const sql = 'SELECT id, user_id, type, amount, category, frequency, note, DATE_FORMAT(next_due_date, "%Y-%m-%d") as next_due_date FROM recurring_templates WHERE is_active = TRUE AND next_due_date <= ?';
    const [rows] = await pool.execute(sql, [dateString]);
    return rows.map(row => ({
      ...row,
      amount: parseFloat(row.amount || 0)
    }));
  },

  /**
   * Membuat templat baru untuk transaksi berulang untuk user tertentu
   */
  async create(userId, data) {
    const { type, amount, category, frequency, note, next_due_date } = data;
    const formattedDate = typeof next_due_date === 'string' ? next_due_date.split('T')[0] : new Date(next_due_date).toISOString().split('T')[0];
    const sql = 'INSERT INTO recurring_templates (user_id, type, amount, category, frequency, note, next_due_date) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const [result] = await pool.execute(sql, [userId, type, amount, category, frequency, note || null, formattedDate]);
    return {
      id: result.insertId,
      ...data,
      amount: parseFloat(amount),
      next_due_date: formattedDate,
      is_active: true
    };
  },

  /**
   * Memperbarui tanggal jatuh tempo berikutnya
   */
  async updateNextDueDate(id, nextDueDate, connection = null) {
    const formattedDate = typeof nextDueDate === 'string' ? nextDueDate.split('T')[0] : new Date(nextDueDate).toISOString().split('T')[0];
    const sql = 'UPDATE recurring_templates SET next_due_date = ? WHERE id = ?';
    const client = connection || pool;
    const [result] = await client.execute(sql, [formattedDate, id]);
    return result.affectedRows > 0;
  },

  /**
   * Menonaktifkan/mengaktifkan templat berulang (mendukung aksi berpasangan)
   */
  async toggleActive(id, userId, isActive, partnerId = null) {
    const userIds = partnerId ? [userId, partnerId] : [userId];
    const sql = 'UPDATE recurring_templates SET is_active = ? WHERE id = ? AND user_id IN (?)';
    const [result] = await pool.query(sql, [isActive ? 1 : 0, id, userIds]);
    return result.affectedRows > 0;
  },

  /**
   * Menghapus templat transaksi berulang (mendukung saling percaya antar pasangan)
   */
  async delete(id, userId, partnerId = null) {
    const userIds = partnerId ? [userId, partnerId] : [userId];
    const sql = 'DELETE FROM recurring_templates WHERE id = ? AND user_id IN (?)';
    const [result] = await pool.query(sql, [id, userIds]);
    return result.affectedRows > 0;
  }
};

export default RecurringModel;
