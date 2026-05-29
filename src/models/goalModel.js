import { pool } from '../config/db.js';

const GoalModel = {
  /**
   * Mengambil seluruh target tabungan (mendukung Mode Pasangan)
   */
  async getAll(userId, partnerId = null) {
    const userIds = partnerId ? [userId, partnerId] : [userId];
    const sql = `
      SELECT g.id, g.name, g.target_amount, g.current_amount, DATE_FORMAT(g.target_date, "%Y-%m-%d") as target_date, g.created_at, u.username as creator_name 
      FROM savings_goals g
      JOIN users u ON g.user_id = u.id
      WHERE g.user_id IN (?) 
      ORDER BY g.target_date ASC
    `;
    const [rows] = await pool.query(sql, [userIds]);
    return rows.map(row => ({
      ...row,
      target_amount: parseFloat(row.target_amount || 0),
      current_amount: parseFloat(row.current_amount || 0)
    }));
  },

  /**
   * Mengambil target tabungan berdasarkan ID (mendukung Mode Pasangan)
   */
  async getById(id, userId, partnerId = null) {
    const userIds = partnerId ? [userId, partnerId] : [userId];
    const sql = `
      SELECT g.id, g.name, g.target_amount, g.current_amount, DATE_FORMAT(g.target_date, "%Y-%m-%d") as target_date, g.created_at, u.username as creator_name 
      FROM savings_goals g
      JOIN users u ON g.user_id = u.id
      WHERE g.id = ? AND g.user_id IN (?)
    `;
    const [rows] = await pool.query(sql, [id, userIds]);
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
    const formattedDate = typeof target_date === 'string' ? target_date.split('T')[0] : new Date(target_date).toISOString().split('T')[0];
    const sql = 'INSERT INTO savings_goals (user_id, name, target_amount, target_date, current_amount) VALUES (?, ?, ?, ?, ?)';
    const [result] = await pool.execute(sql, [userId, name, target_amount, formattedDate, current_amount]);
    return {
      id: result.insertId,
      name,
      target_amount: parseFloat(target_amount),
      target_date: formattedDate,
      current_amount: parseFloat(current_amount)
    };
  },

  /**
   * Mengalokasikan tabungan ke dalam goal tertentu (tambah nominal tabungan, mendukung aksi berpasangan)
   */
  async addContribution(id, userId, amount, partnerId = null) {
    const userIds = partnerId ? [userId, partnerId] : [userId];
    const sql = 'UPDATE savings_goals SET current_amount = current_amount + ? WHERE id = ? AND user_id IN (?)';
    const [result] = await pool.query(sql, [amount, id, userIds]);
    return result.affectedRows > 0;
  },

  /**
   * Memperbarui detail target tabungan (mendukung aksi berpasangan)
   */
  async update(id, userId, data, partnerId = null) {
    const { name, target_amount, target_date } = data;
    const userIds = partnerId ? [userId, partnerId] : [userId];
    const formattedDate = typeof target_date === 'string' ? target_date.split('T')[0] : new Date(target_date).toISOString().split('T')[0];
    const sql = 'UPDATE savings_goals SET name = ?, target_amount = ?, target_date = ? WHERE id = ? AND user_id IN (?)';
    const [result] = await pool.query(sql, [name, target_amount, formattedDate, id, userIds]);
    return result.affectedRows > 0;
  },

  /**
   * Menghapus target tabungan (mendukung saling percaya antar pasangan)
   */
  async delete(id, userId, partnerId = null) {
    const userIds = partnerId ? [userId, partnerId] : [userId];
    const sql = 'DELETE FROM savings_goals WHERE id = ? AND user_id IN (?)';
    const [result] = await pool.query(sql, [id, userIds]);
    return result.affectedRows > 0;
  }
};

export default GoalModel;
