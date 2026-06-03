import { pool } from '../config/db.js';

const CategoryModel = {
  /**
   * Inisialisasi tabel categories dan seeding data bawaan jika belum ada
   */
  async initializeTable() {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS \`categories\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NULL,
        \`type\` ENUM('income', 'expense') NOT NULL,
        \`name\` VARCHAR(100) NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`uq_user_category_type\` (\`user_id\`, \`name\`, \`type\`),
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await pool.query(createTableSql);

    // Cek apakah data default sudah ada
    const [countRows] = await pool.query('SELECT COUNT(*) as count FROM categories WHERE user_id IS NULL');
    if (countRows[0].count === 0) {
      console.log('[Database] Melakukan seeding kategori bawaan sistem...');
      const defaultCategories = [
        // Income
        { type: 'income', name: 'Gaji' },
        { type: 'income', name: 'Bonus' },
        { type: 'income', name: 'Investasi' },
        { type: 'income', name: 'Deposito' },
        { type: 'income', name: 'Hibah/Hadiah' },
        { type: 'income', name: 'Penjualan' },
        { type: 'income', name: 'Lain-lain' },
        // Expense
        { type: 'expense', name: 'Makanan & Minuman' },
        { type: 'expense', name: 'Belanja Harian' },
        { type: 'expense', name: 'Transportasi' },
        { type: 'expense', name: 'Utilitas & Tagihan' },
        { type: 'expense', name: 'Sewa Rumah & Kos' },
        { type: 'expense', name: 'Kesehatan' },
        { type: 'expense', name: 'Pendidikan' },
        { type: 'expense', name: 'Hiburan & Rekreasi' },
        { type: 'expense', name: 'Liburan' },
        { type: 'expense', name: 'Pajak & Asuransi' },
        { type: 'expense', name: 'Amal & Donasi' },
        { type: 'expense', name: 'Lain-lain' }
      ];

      const insertSql = 'INSERT IGNORE INTO categories (user_id, type, name) VALUES ?';
      const values = defaultCategories.map(c => [null, c.type, c.name]);
      await pool.query(insertSql, [values]);
      console.log('[Database] Seeding kategori selesai.');
    }
  },

  /**
   * Mendapatkan semua kategori (bawaan + kustom) milik user
   */
  async getAll(userId, type = null) {
    let sql = 'SELECT id, user_id, type, name, created_at FROM categories WHERE user_id IS NULL OR user_id = ?';
    const params = [userId];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY type ASC, user_id DESC, name ASC';
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  /**
   * Mendapatkan satu kategori kustom milik user berdasarkan ID
   */
  async getById(id, userId) {
    const sql = 'SELECT id, user_id, type, name, created_at FROM categories WHERE id = ? AND user_id = ?';
    const [rows] = await pool.query(sql, [id, userId]);
    return rows[0] || null;
  },

  /**
   * Mengecek apakah kategori ada berdasarkan nama, tipe, dan user (termasuk default)
   */
  async existsByNameAndType(userId, name, type) {
    const sql = `
      SELECT id FROM categories 
      WHERE (user_id IS NULL OR user_id = ?) 
        AND LOWER(name) = LOWER(?) 
        AND type = ?
    `;
    const [rows] = await pool.query(sql, [userId, name.trim(), type]);
    return rows.length > 0;
  },

  /**
   * Membuat kategori kustom baru untuk user
   */
  async create(userId, data) {
    const { name, type } = data;
    const sql = 'INSERT INTO categories (user_id, type, name) VALUES (?, ?, ?)';
    const [result] = await pool.execute(sql, [userId, type, name.trim()]);
    return {
      id: result.insertId,
      user_id: userId,
      type,
      name: name.trim()
    };
  },

  /**
   * Mengubah nama kategori kustom dan menyinkronkan seluruh transaksi/budget/recurring
   */
  async update(id, userId, newName) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Dapatkan info kategori lama terlebih dahulu
      const getOldSql = 'SELECT name, type FROM categories WHERE id = ? AND user_id = ?';
      const [oldRows] = await connection.query(getOldSql, [id, userId]);
      if (oldRows.length === 0) {
        throw new Error('Kategori tidak ditemukan atau merupakan kategori default bawaan.');
      }
      
      const oldName = oldRows[0].name;
      const type = oldRows[0].type;

      // Update di tabel categories
      const updateCatSql = 'UPDATE categories SET name = ? WHERE id = ? AND user_id = ?';
      await connection.execute(updateCatSql, [newName.trim(), id, userId]);

      // Sinkronkan ke transaksi
      const updateTxSql = 'UPDATE transactions SET category = ? WHERE user_id = ? AND category = ? AND type = ?';
      await connection.execute(updateTxSql, [newName.trim(), userId, oldName, type]);

      // Sinkronkan ke budgets (hanya bertipe expense)
      if (type === 'expense') {
        // Karena ada unique key uq_user_category_month_year di budgets, kita harus berhati-hati agar update tidak melanggar constraint.
        // Jika target category baru sudah memiliki anggaran di bulan/tahun yang sama, nominal bisa digabungkan, atau kita abaikan duplikasi/update.
        // Tetapi karena nama kategori diubah, kita jalankan query update biasa terlebih dahulu.
        const updateBgtSql = 'UPDATE budgets SET category = ? WHERE user_id = ? AND category = ?';
        await connection.execute(updateBgtSql, [newName.trim(), userId, oldName]);
      }

      // Sinkronkan ke recurring_templates
      const updateRecSql = 'UPDATE recurring_templates SET category = ? WHERE user_id = ? AND category = ? AND type = ?';
      await connection.execute(updateRecSql, [newName.trim(), userId, oldName, type]);

      await connection.commit();
      return {
        id,
        user_id: userId,
        type,
        old_name: oldName,
        new_name: newName.trim()
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Menghapus kategori kustom milik user dan memindahkan data terkait ke 'Lain-lain'
   */
  async delete(id, userId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Dapatkan info kategori lama terlebih dahulu
      const getOldSql = 'SELECT name, type FROM categories WHERE id = ? AND user_id = ?';
      const [oldRows] = await connection.query(getOldSql, [id, userId]);
      if (oldRows.length === 0) {
        throw new Error('Kategori tidak ditemukan atau merupakan kategori default bawaan.');
      }
      
      const oldName = oldRows[0].name;
      const type = oldRows[0].type;

      // Hapus kategori dari tabel categories
      const deleteCatSql = 'DELETE FROM categories WHERE id = ? AND user_id = ?';
      const [result] = await connection.execute(deleteCatSql, [id, userId]);

      if (result.affectedRows === 0) {
        await connection.rollback();
        return false;
      }

      // Sinkronkan transaksi ke 'Lain-lain'
      const updateTxSql = 'UPDATE transactions SET category = "Lain-lain" WHERE user_id = ? AND category = ? AND type = ?';
      await connection.execute(updateTxSql, [userId, oldName, type]);

      // Sinkronkan budgets ke 'Lain-lain'
      if (type === 'expense') {
        // Karena unik uq_user_category_month_year, kita update dengan memikirkan konflik jika 'Lain-lain' sudah ada.
        // Cara aman: Cari budgets dengan category = oldName. Untuk setiap budget tersebut, coba update ke 'Lain-lain'. 
        // Jika ada konflik duplicate key, jumlahkan limit anggarannya dan hapus budget yang lama.
        const getBudgetsSql = 'SELECT id, amount, month, year FROM budgets WHERE user_id = ? AND category = ?';
        const [budgets] = await connection.query(getBudgetsSql, [userId, oldName]);
        
        for (const b of budgets) {
          const checkConflictSql = 'SELECT id, amount FROM budgets WHERE user_id = ? AND category = "Lain-lain" AND month = ? AND year = ?';
          const [conflicts] = await connection.query(checkConflictSql, [userId, b.month, b.year]);
          
          if (conflicts.length > 0) {
            // Gabungkan budget
            const newAmount = parseFloat(conflicts[0].amount) + parseFloat(b.amount);
            await connection.execute('UPDATE budgets SET amount = ? WHERE id = ?', [newAmount, conflicts[0].id]);
            await connection.execute('DELETE FROM budgets WHERE id = ?', [b.id]);
          } else {
            // Update nama kategori ke 'Lain-lain'
            await connection.execute('UPDATE budgets SET category = "Lain-lain" WHERE id = ?', [b.id]);
          }
        }
      }

      // Sinkronkan recurring_templates ke 'Lain-lain'
      const updateRecSql = 'UPDATE recurring_templates SET category = "Lain-lain" WHERE user_id = ? AND category = ? AND type = ?';
      await connection.execute(updateRecSql, [userId, oldName, type]);

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};

export default CategoryModel;
