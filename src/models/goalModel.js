import { pool } from '../config/db.js';

const GoalModel = {
  /**
   * Mengambil seluruh target tabungan untuk user tertentu
   */
  async getAll(userId) {
    const sql = 'SELECT id, name, target_amount, current_amount, DATE_FORMAT(target_date, "%Y-%m-%d") as target_date, created_at FROM savings_goals WHERE user_id = ? ORDER BY target_date ASC';
    const [rows] = await pool.execute(sql, [userId]);
    return rows.map(row => ({
      ...row,
      target_amount: parseFloat(row.target_amount || 0),
      current_amount: parseFloat(row.current_amount || 0)
    }));
  },

  /**
   * Mengambil target tabungan berdasarkan ID untuk user tertentu
   */
  async getById(id, userId) {
    const sql = 'SELECT id, name, target_amount, current_amount, DATE_FORMAT(target_date, "%Y-%m-%d") as target_date, created_at FROM savings_goals WHERE id = ? AND user_id = ?';
    const [rows] = await pool.execute(sql, [id, userId]);
    if (rows[0]) {
      rows[0].target_amount = parseFloat(rows[0].target_amount || 0);
      rows[0].current_amount = parseFloat(rows[0].current_amount || 0);
      return rows[0];
    }
    return null;
  },

  /**
   * Membuat target tabungan baru untuk user tertentu
   */
  async create(userId, data) {
    const { name, target_amount, target_date, current_amount = 0 } = data;
    const sql = 'INSERT INTO savings_goals (user_id, name, target_amount, target_date, current_amount) VALUES (?, ?, ?, ?, ?)';
    const [result] = await pool.execute(sql, [userId, name, target_amount, target_date, current_amount]);
    return {
      id: result.insertId,
      name,
      target_amount: parseFloat(target_amount),
      target_date,
      current_amount: parseFloat(current_amount)
    };
  },

  /**
   * Mengalokasikan tabungan ke dalam goal tertentu (tambah nominal tabungan) untuk user tertentu
   */
  async addContribution(id, userId, amount) {
    const sql = 'UPDATE savings_goals SET current_amount = current_amount + ? WHERE id = ? AND user_id = ?';
    const [result] = await pool.execute(sql, [amount, id, userId]);
    return result.affectedRows > 0;
  },

  /**
   * Memperbarui detail target tabungan untuk user tertentu
   */
  async update(id, userId, data) {
    const { name, target_amount, target_date } = data;
    const sql = 'UPDATE savings_goals SET name = ?, target_amount = ?, target_date = ? WHERE id = ? AND user_id = ?';
    const [result] = await pool.execute(sql, [name, target_amount, target_date, id, userId]);
    return result.affectedRows > 0;
  },

  /**
   * Menghapus target tabungan untuk user tertentu
   */
  async delete(id, userId) {
    const sql = 'DELETE FROM savings_goals WHERE id = ? AND user_id = ?';
    const [result] = await pool.execute(sql, [id, userId]);
    return result.affectedRows > 0;
  }
};

export default GoalModel;
