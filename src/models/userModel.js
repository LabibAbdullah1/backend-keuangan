import { pool } from '../config/db.js';

const UserModel = {
  /**
   * Mencari user berdasarkan username atau email
   */
  async findByUsernameOrEmail(identifier) {
    const sql = 'SELECT * FROM users WHERE username = ? OR email = ?';
    const [rows] = await pool.execute(sql, [identifier, identifier]);
    return rows[0] || null;
  },

  /**
   * Mencari user berdasarkan ID
   */
  async findById(id) {
    const sql = 'SELECT id, username, email, created_at FROM users WHERE id = ?';
    const [rows] = await pool.execute(sql, [id]);
    return rows[0] || null;
  },

  /**
   * Mendaftarkan user baru
   */
  async create(username, email, hashedPassword) {
    const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
    const [result] = await pool.execute(sql, [username, email, hashedPassword]);
    return {
      id: result.insertId,
      username,
      email
    };
  },

  /**
   * Menyimpan/memperbarui refresh token user di database
   */
  async updateRefreshToken(id, refreshToken) {
    const sql = 'UPDATE users SET refresh_token = ? WHERE id = ?';
    const [result] = await pool.execute(sql, [refreshToken, id]);
    return result.affectedRows > 0;
  },

  /**
   * Mencari user berdasarkan refresh token aktif
   */
  async findByRefreshToken(refreshToken) {
    const sql = 'SELECT * FROM users WHERE refresh_token = ?';
    const [rows] = await pool.execute(sql, [refreshToken]);
    return rows[0] || null;
  },

  /**
   * Menghapus/mengosongkan refresh token (Logout)
   */
  async clearRefreshToken(id) {
    const sql = 'UPDATE users SET refresh_token = NULL WHERE id = ?';
    const [result] = await pool.execute(sql, [id]);
    return result.affectedRows > 0;
  },

  /**
   * Memeriksa apakah username atau email sudah digunakan oleh user lain
   */
  async existsOther(id, username, email) {
    const sql = 'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?';
    const [rows] = await pool.execute(sql, [username, email, id]);
    return rows.length > 0;
  },

  /**
   * Memperbarui profil user (username, email, password opsional)
   */
  async update(id, username, email, hashedPassword = null) {
    if (hashedPassword) {
      const sql = 'UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?';
      const [result] = await pool.execute(sql, [username, email, hashedPassword, id]);
      return result.affectedRows > 0;
    } else {
      const sql = 'UPDATE users SET username = ?, email = ? WHERE id = ?';
      const [result] = await pool.execute(sql, [username, email, id]);
      return result.affectedRows > 0;
    }
  }
};

export default UserModel;
