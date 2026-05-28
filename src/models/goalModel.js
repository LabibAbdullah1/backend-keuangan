import { pool } from '../config/db.js';

const GoalModel = {
  /**
   * Mengambil seluruh target tabungan
   */
  async getAll() {
    const sql = 'SELECT id, name, target_amount, current_amount, DATE_FORMAT(target_date, "%Y-%m-%d") as target_date, created_at FROM savings_goals ORDER BY target_date ASC';
    const [rows] = await pool.execute(sql);
    return rows.map(row => ({
      ...row,
      target_amount: parseFloat(row.target_amount || 0),
      current_amount: parseFloat(row.current_amount || 0)
    }));
  },

  /**
   * Mengambil target tabungan berdasarkan ID
   */
  async getById(id) {
    const sql = 'SELECT id, name, target_amount, current_amount, DATE_FORMAT(target_date, "%Y-%m-%d") as target_date, created_at FROM savings_goals WHERE id = ?';
    const [rows] = await pool.execute(sql, [id]);
    if (rows[0]) {
      rows[0].target_amount = parseFloat(rows[0].target_amount || 0);
      rows[0].current_amount = parseFloat(rows[0].current_amount || 0);
      return rows[0];
    }
    return null;
  },

  /**
   * Membuat target tabungan baru
   */
  async create(data) {
    const { name, target_amount, target_date, current_amount = 0 } = data;
    const sql = 'INSERT INTO savings_goals (name, target_amount, target_date, current_amount) VALUES (?, ?, ?, ?)';
    const [result] = await pool.execute(sql, [name, target_amount, target_date, current_amount]);
    return {
      id: result.insertId,
      name,
      target_amount: parseFloat(target_amount),
      target_date,
      current_amount: parseFloat(current_amount)
    };
  },

  /**
   * Mengalokasikan tabungan ke dalam goal tertentu (tambah nominal tabungan)
   */
  async addContribution(id, amount) {
    const sql = 'UPDATE savings_goals SET current_amount = current_amount + ? WHERE id = ?';
    const [result] = await pool.execute(sql, [amount, id]);
    return result.affectedRows > 0;
  },

  /**
   * Memperbarui detail target tabungan
   */
  async update(id, data) {
    const { name, target_amount, target_date } = data;
    const sql = 'UPDATE savings_goals SET name = ?, target_amount = ?, target_date = ? WHERE id = ?';
    const [result] = await pool.execute(sql, [name, target_amount, target_date, id]);
    return result.affectedRows > 0;
  },

  /**
   * Menghapus target tabungan
   */
  async delete(id) {
    const sql = 'DELETE FROM savings_goals WHERE id = ?';
    const [result] = await pool.execute(sql, [id]);
    return result.affectedRows > 0;
  }
};

export default GoalModel;
