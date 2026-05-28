import { pool } from '../config/db.js';

const RecurringModel = {
  /**
   * Mengambil semua templat transaksi berulang untuk user tertentu
   */
  async getAll(userId) {
    const sql = 'SELECT id, type, amount, category, frequency, note, DATE_FORMAT(next_due_date, "%Y-%m-%d") as next_due_date, is_active, created_at FROM recurring_templates WHERE user_id = ? ORDER BY next_due_date ASC';
    const [rows] = await pool.execute(sql, [userId]);
    return rows.map(row => ({
      ...row,
      amount: parseFloat(row.amount || 0),
      is_active: Boolean(row.is_active)
    }));
  },

  /**
   * Mengambil templat transaksi berulang berdasarkan ID untuk user tertentu
   */
  async getById(id, userId) {
    const sql = 'SELECT id, type, amount, category, frequency, note, DATE_FORMAT(next_due_date, "%Y-%m-%d") as next_due_date, is_active, created_at FROM recurring_templates WHERE id = ? AND user_id = ?';
    const [rows] = await pool.execute(sql, [id, userId]);
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
    const sql = 'INSERT INTO recurring_templates (user_id, type, amount, category, frequency, note, next_due_date) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const [result] = await pool.execute(sql, [userId, type, amount, category, frequency, note || null, next_due_date]);
    return {
      id: result.insertId,
      ...data,
      amount: parseFloat(amount),
      is_active: true
    };
  },

  /**
   * Memperbarui tanggal jatuh tempo berikutnya
   */
  async updateNextDueDate(id, nextDueDate, connection = null) {
    const sql = 'UPDATE recurring_templates SET next_due_date = ? WHERE id = ?';
    const client = connection || pool;
    const [result] = await client.execute(sql, [nextDueDate, id]);
    return result.affectedRows > 0;
  },

  /**
   * Menonaktifkan/mengaktifkan templat berulang untuk user tertentu
   */
  async toggleActive(id, userId, isActive) {
    const sql = 'UPDATE recurring_templates SET is_active = ? WHERE id = ? AND user_id = ?';
    const [result] = await pool.execute(sql, [isActive ? 1 : 0, id, userId]);
    return result.affectedRows > 0;
  },

  /**
   * Menghapus templat transaksi berulang untuk user tertentu
   */
  async delete(id, userId) {
    const sql = 'DELETE FROM recurring_templates WHERE id = ? AND user_id = ?';
    const [result] = await pool.execute(sql, [id, userId]);
    return result.affectedRows > 0;
  }
};

export default RecurringModel;
