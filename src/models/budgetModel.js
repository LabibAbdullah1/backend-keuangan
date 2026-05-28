import { pool } from '../config/db.js';

const BudgetModel = {
  /**
   * Mengambil semua daftar anggaran berdasarkan bulan dan tahun
   */
  async getAll(month, year) {
    let sql = 'SELECT id, category, amount, month, year, created_at FROM budgets WHERE 1=1';
    const params = [];

    if (month) {
      sql += ' AND month = ?';
      params.push(parseInt(month, 10));
    }
    if (year) {
      sql += ' AND year = ?';
      params.push(parseInt(year, 10));
    }

    sql += ' ORDER BY year DESC, month DESC, category ASC';
    const [rows] = await pool.execute(sql, params);
    return rows.map(row => ({
      ...row,
      amount: parseFloat(row.amount || 0)
    }));
  },

  /**
   * Mengambil satu budget berdasarkan kategori, bulan, dan tahun
   */
  async getByCategoryAndMonth(category, month, year) {
    const sql = 'SELECT id, category, amount, month, year, created_at FROM budgets WHERE category = ? AND month = ? AND year = ?';
    const [rows] = await pool.execute(sql, [category, parseInt(month, 10), parseInt(year, 10)]);
    if (rows[0]) {
      rows[0].amount = parseFloat(rows[0].amount || 0);
      return rows[0];
    }
    return null;
  },

  /**
   * Membuat atau memperbarui budget kategori (Upsert)
   */
  async upsert(data) {
    const { category, amount, month, year } = data;
    const sql = `
      INSERT INTO budgets (category, amount, month, year)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE amount = VALUES(amount)
    `;
    const [result] = await pool.execute(sql, [category, amount, parseInt(month, 10), parseInt(year, 10)]);
    return {
      upserted: true,
      category,
      amount: parseFloat(amount),
      month,
      year,
      id: result.insertId || null
    };
  },

  /**
   * Menghapus anggaran berdasarkan ID
   */
  async delete(id) {
    const sql = 'DELETE FROM budgets WHERE id = ?';
    const [result] = await pool.execute(sql, [id]);
    return result.affectedRows > 0;
  }
};

export default BudgetModel;
