import { pool } from '../config/db.js';

const TransactionModel = {
  /**
   * Mengambil daftar transaksi dengan opsi filter
   */
  async getAll(userId, filters = {}) {
    const { type, category, limit = 100, offset = 0 } = filters;
    let sql = 'SELECT id, type, amount, category, DATE_FORMAT(date, "%Y-%m-%d") as date, note, created_at FROM transactions WHERE user_id = ?';
    const params = [userId];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY date DESC, id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  /**
   * Mengambil detail transaksi berdasarkan ID
   */
  async getById(id, userId) {
    const sql = 'SELECT id, type, amount, category, DATE_FORMAT(date, "%Y-%m-%d") as date, note, created_at FROM transactions WHERE id = ? AND user_id = ?';
    const [rows] = await pool.execute(sql, [id, userId]);
    return rows[0] || null;
  },

  /**
   * Memasukkan transaksi baru ke database
   */
  async create(userId, data) {
    const { type, amount, category, date, note } = data;
    const sql = 'INSERT INTO transactions (user_id, type, amount, category, date, note) VALUES (?, ?, ?, ?, ?, ?)';
    const [result] = await pool.execute(sql, [userId, type, amount, category, date, note || null]);
    return {
      id: result.insertId,
      ...data
    };
  },

  /**
   * Menghapus transaksi berdasarkan ID
   */
  async delete(id, userId) {
    const sql = 'DELETE FROM transactions WHERE id = ? AND user_id = ?';
    const [result] = await pool.execute(sql, [id, userId]);
    return result.affectedRows > 0;
  },

  /**
   * Agregasi pengeluaran berdasarkan kategori untuk bulan berjalan
   */
  async getExpenseByCategoryForCurrentMonth(userId) {
    const sql = `
      SELECT category, SUM(amount) as total_amount
      FROM transactions
      WHERE type = 'expense'
        AND user_id = ?
        AND date >= DATE_FORMAT(NOW(), '%Y-%m-01')
        AND date <= LAST_DAY(NOW())
      GROUP BY category
      ORDER BY total_amount DESC
    `;
    const [rows] = await pool.execute(sql, [userId]);
    return rows.map(row => ({
      category: row.category,
      total_amount: parseFloat(row.total_amount || 0)
    }));
  },

  /**
   * Menghitung total saldo akhir, total pemasukan, dan total pengeluaran secara real-time
   */
  async getSummary(userId) {
    const sql = `
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense
      FROM transactions
      WHERE user_id = ?
    `;
    const [rows] = await pool.execute(sql, [userId]);
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
   * Mengambil pengeluaran total kategori tertentu pada bulan berjalan
   */
  async getCategorySpendingForMonth(userId, category, month, year) {
    const sql = `
      SELECT SUM(amount) as total_spent
      FROM transactions
      WHERE type = 'expense'
        AND user_id = ?
        AND category = ?
        AND MONTH(date) = ?
        AND YEAR(date) = ?
    `;
    const [rows] = await pool.execute(sql, [userId, category, month, year]);
    return parseFloat(rows[0].total_spent || 0);
  },

  /**
   * Mendapatkan histori arus kas (cashflow) bulanan
   */
  async getMonthlyCashflowHistory(userId, limitMonths = 6) {
    const sql = `
      SELECT 
        DATE_FORMAT(date, '%Y-%m') as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE user_id = ?
      GROUP BY DATE_FORMAT(date, '%Y-%m')
      ORDER BY month DESC
      LIMIT ?
    `;
    const [rows] = await pool.query(sql, [userId, parseInt(limitMonths, 10)]);
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
