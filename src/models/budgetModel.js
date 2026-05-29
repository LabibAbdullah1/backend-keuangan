import { pool } from '../config/db.js';

const BudgetModel = {
  /**
   * Mengambil semua daftar anggaran berdasarkan bulan dan tahun (mendukung Mode Pasangan)
   * Jika partnerId aktif, nominal anggaran dengan kategori yang sama otomatis digabungkan.
   */
  async getAll(userId, month, year, partnerId = null) {
    const userIds = partnerId ? [userId, partnerId] : [userId];
    let sql;
    const params = [];

    if (partnerId) {
      // Kelompokkan berdasarkan kategori, bulan, tahun dan jumlahkan limit anggarannya
      sql = 'SELECT MIN(id) as id, category, SUM(amount) as amount, month, year, MIN(created_at) as created_at FROM budgets WHERE user_id IN (?)';
      params.push(userIds);
    } else {
      sql = 'SELECT id, category, amount, month, year, created_at FROM budgets WHERE user_id = ?';
      params.push(userId);
    }

    if (month) {
      sql += ' AND month = ?';
      params.push(parseInt(month, 10));
    }
    if (year) {
      sql += ' AND year = ?';
      params.push(parseInt(year, 10));
    }

    if (partnerId) {
      sql += ' GROUP BY category, month, year';
    }

    sql += ' ORDER BY year DESC, month DESC, category ASC';
    const [rows] = await pool.query(sql, params);
    return rows.map(row => ({
      ...row,
      amount: parseFloat(row.amount || 0)
    }));
  },

  /**
   * Mengambil satu budget berdasarkan kategori, bulan, dan tahun (mendukung Mode Pasangan)
   */
  async getByCategoryAndMonth(userId, category, month, year, partnerId = null) {
    const userIds = partnerId ? [userId, partnerId] : [userId];
    let sql;
    const params = [userIds, category, parseInt(month, 10), parseInt(year, 10)];

    if (partnerId) {
      sql = 'SELECT MIN(id) as id, category, SUM(amount) as amount, month, year, MIN(created_at) as created_at FROM budgets WHERE user_id IN (?) AND category = ? AND month = ? AND year = ? GROUP BY category, month, year';
    } else {
      sql = 'SELECT id, category, amount, month, year, created_at FROM budgets WHERE user_id IN (?) AND category = ? AND month = ? AND year = ?';
    }

    const [rows] = await pool.query(sql, params);
    if (rows[0]) {
      rows[0].amount = parseFloat(rows[0].amount || 0);
      return rows[0];
    }
    return null;
  },

  /**
   * Membuat atau memperbarui budget kategori (Upsert) untuk user tertentu
   */
  async upsert(userId, data) {
    const { category, amount, month, year } = data;
    const sql = `
      INSERT INTO budgets (user_id, category, amount, month, year)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE amount = VALUES(amount)
    `;
    const [result] = await pool.execute(sql, [userId, category, amount, parseInt(month, 10), parseInt(year, 10)]);
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
   * Menghapus anggaran berdasarkan ID (mendukung saling percaya antar pasangan)
   */
  async delete(id, userId, partnerId = null) {
    const userIds = partnerId ? [userId, partnerId] : [userId];
    const sql = 'DELETE FROM budgets WHERE id = ? AND user_id IN (?)';
    const [result] = await pool.query(sql, [id, userIds]);
    return result.affectedRows > 0;
  }
};

export default BudgetModel;
