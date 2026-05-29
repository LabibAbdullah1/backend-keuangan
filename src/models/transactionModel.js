import { pool } from '../config/db.js';

const TransactionModel = {
  /**
   * Mengambil daftar transaksi dengan opsi filter (mendukung Mode Pasangan)
   */
  async getAll(userId, filters = {}) {
    const { type, category, limit = 100, offset = 0, partnerId = null } = filters;
    const userIds = partnerId ? [userId, partnerId] : [userId];
    
    let sql = `
      SELECT t.id, t.type, t.amount, t.category, DATE_FORMAT(t.date, "%Y-%m-%d") as date, t.note, t.created_at, u.username as creator_name 
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.user_id IN (?)
    `;
    const params = [userIds];

    if (type) {
      sql += ' AND t.type = ?';
      params.push(type);
    }

    if (category) {
      sql += ' AND t.category = ?';
      params.push(category);
    }

    sql += ' ORDER BY t.date DESC, t.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  /**
   * Mengambil detail transaksi berdasarkan ID (mendukung Mode Pasangan)
   */
  async getById(id, userId, partnerId = null) {
    const userIds = partnerId ? [userId, partnerId] : [userId];
    const sql = `
      SELECT t.id, t.type, t.amount, t.category, DATE_FORMAT(t.date, "%Y-%m-%d") as date, t.note, t.created_at, u.username as creator_name 
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = ? AND t.user_id IN (?)
    `;
    const [rows] = await pool.query(sql, [id, userIds]);
    return rows[0] || null;
  },

  /**
   * Memasukkan transaksi baru ke database
   */
  async create(userId, data) {
    const { type, amount, category, date, note } = data;
    const formattedDate = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
    const sql = 'INSERT INTO transactions (user_id, type, amount, category, date, note) VALUES (?, ?, ?, ?, ?, ?)';
    const [result] = await pool.execute(sql, [userId, type, amount, category, formattedDate, note || null]);
    return {
      id: result.insertId,
      ...data,
      date: formattedDate
    };
  },

  /**
   * Menghapus transaksi berdasarkan ID (mendukung saling percaya antar pasangan)
   */
  async delete(id, userId, partnerId = null) {
    const userIds = partnerId ? [userId, partnerId] : [userId];
    const sql = 'DELETE FROM transactions WHERE id = ? AND user_id IN (?)';
    const [result] = await pool.query(sql, [id, userIds]);
    return result.affectedRows > 0;
  },

  /**
   * Agregasi pengeluaran berdasarkan kategori untuk bulan berjalan (mendukung Mode Pasangan)
   */
  async getExpenseByCategoryForCurrentMonth(userId, partnerId = null) {
    const userIds = partnerId ? [userId, partnerId] : [userId];
    const sql = `
      SELECT category, SUM(amount) as total_amount
      FROM transactions
      WHERE type = 'expense'
        AND user_id IN (?)
        AND date >= DATE_FORMAT(NOW(), '%Y-%m-01')
        AND date <= LAST_DAY(NOW())
      GROUP BY category
      ORDER BY total_amount DESC
    `;
    const [rows] = await pool.query(sql, [userIds]);
    return rows.map(row => ({
      category: row.category,
      total_amount: parseFloat(row.total_amount || 0)
    }));
  },

  /**
   * Menghitung total saldo akhir, total pemasukan, dan total pengeluaran secara real-time (mendukung Mode Pasangan)
   */
  async getSummary(userId, partnerId = null) {
    const userIds = partnerId ? [userId, partnerId] : [userId];
    const sql = `
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense
      FROM transactions
      WHERE user_id IN (?)
    `;
    const [rows] = await pool.query(sql, [userIds]);
    const totalIncome = parseFloat(rows[0].total_income || 0);
    const totalExpense = parseFloat(rows[0].total_expense || 0);
    const balance = totalIncome - totalExpense;

    return {
      total_income: totalIncome,
      total_expense: totalExpense,
      balance: balance
    };
  },

  /**
   * Mengambil pengeluaran total kategori tertentu pada bulan berjalan (mendukung Mode Pasangan)
   */
  async getCategorySpendingForMonth(userId, category, month, year, partnerId = null) {
    const userIds = partnerId ? [userId, partnerId] : [userId];
    const sql = `
      SELECT SUM(amount) as total_spent
      FROM transactions
      WHERE type = 'expense'
        AND user_id IN (?)
        AND category = ?
        AND MONTH(date) = ?
        AND YEAR(date) = ?
    `;
    const [rows] = await pool.query(sql, [userIds, category, month, year]);
    return parseFloat(rows[0].total_spent || 0);
  },

  /**
   * Mendapatkan histori arus kas (cashflow) bulanan (mendukung Mode Pasangan)
   */
  async getMonthlyCashflowHistory(userId, limitMonths = 6, partnerId = null) {
    const userIds = partnerId ? [userId, partnerId] : [userId];
    const sql = `
      SELECT 
        DATE_FORMAT(date, '%Y-%m') as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE user_id IN (?)
      GROUP BY DATE_FORMAT(date, '%Y-%m')
      ORDER BY month DESC
      LIMIT ?
    `;
    const [rows] = await pool.query(sql, [userIds, parseInt(limitMonths, 10)]);
    return rows.map(row => {
      const inc = parseFloat(row.income || 0);
      const exp = parseFloat(row.expense || 0);
      return {
        month: row.month,
        income: inc,
        expense: exp,
        net_cashflow: inc - exp
      };
    });
  }
};

export default TransactionModel;
