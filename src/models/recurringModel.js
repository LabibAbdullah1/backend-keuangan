import { pool } from '../config/db.js';

const RecurringModel = {
  /**
   * Mengambil semua templat transaksi berulang
   */
  async getAll() {
    const sql = 'SELECT id, type, amount, category, frequency, note, DATE_FORMAT(next_due_date, "%Y-%m-%d") as next_due_date, is_active, created_at FROM recurring_templates ORDER BY next_due_date ASC';
    const [rows] = await pool.execute(sql);
    return rows.map(row => ({
      ...row,
      amount: parseFloat(row.amount || 0),
      is_active: Boolean(row.is_active)
    }));
  },

  /**
   * Mengambil templat transaksi berulang berdasarkan ID
   */
  async getById(id) {
    const sql = 'SELECT id, type, amount, category, frequency, note, DATE_FORMAT(next_due_date, "%Y-%m-%d") as next_due_date, is_active, created_at FROM recurring_templates WHERE id = ?';
    const [rows] = await pool.execute(sql, [id]);
    if (rows[0]) {
      rows[0].amount = parseFloat(rows[0].amount || 0);
      rows[0].is_active = Boolean(rows[0].is_active);
      return rows[0];
    }
    return null;
  },

  /**
   * Mengambil seluruh templat yang jatuh tempo (next_due_date <= tanggal yang dikirim) dan berstatus aktif
   */
  async getDueTemplates(dateString) {
    const sql = 'SELECT id, type, amount, category, frequency, note, DATE_FORMAT(next_due_date, "%Y-%m-%d") as next_due_date FROM recurring_templates WHERE is_active = TRUE AND next_due_date <= ?';
    const [rows] = await pool.execute(sql, [dateString]);
    return rows.map(row => ({
      ...row,
      amount: parseFloat(row.amount || 0)
    }));
  },

  /**
   * Membuat templat baru untuk transaksi berulang
   */
  async create(data) {
    const { type, amount, category, frequency, note, next_due_date } = data;
    const sql = 'INSERT INTO recurring_templates (type, amount, category, frequency, note, next_due_date) VALUES (?, ?, ?, ?, ?, ?)';
    const [result] = await pool.execute(sql, [type, amount, category, frequency, note || null, next_due_date]);
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
   * Menonaktifkan/mengaktifkan templat berulang
   */
  async toggleActive(id, isActive) {
    const sql = 'UPDATE recurring_templates SET is_active = ? WHERE id = ?';
    const [result] = await pool.execute(sql, [isActive ? 1 : 0, id]);
    return result.affectedRows > 0;
  },

  /**
   * Menghapus templat transaksi berulang
   */
  async delete(id) {
    const sql = 'DELETE FROM recurring_templates WHERE id = ?';
    const [result] = await pool.execute(sql, [id]);
    return result.affectedRows > 0;
  }
};

export default RecurringModel;
