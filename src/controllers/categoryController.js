import CategoryModel from '../models/categoryModel.js';
import cacheEngine from '../utils/cache.js';

const CategoryController = {
  /**
   * Mengambil semua daftar kategori (bawaan + kustom)
   * GET /api/categories?type=income
   */
  async getCategories(req, res, next) {
    try {
      const userId = req.user.id;
      const { type } = req.query;

      if (type && type !== 'income' && type !== 'expense') {
        return res.status(400).json({
          success: false,
          message: 'Parameter "type" harus bernilai "income" atau "expense".'
        });
      }

      const categories = await CategoryModel.getAll(userId, type);

      res.json({
        success: true,
        count: categories.length,
        data: categories
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Membuat kategori kustom baru
   * POST /api/categories
   */
  async createCategory(req, res, next) {
    try {
      const userId = req.user.id;
      const { name, type } = req.body;

      // Cek apakah kategori dengan nama & tipe yang sama sudah ada (default maupun kustom)
      const exists = await CategoryModel.existsByNameAndType(userId, name, type);
      if (exists) {
        return res.status(400).json({
          success: false,
          message: `Kategori "${name}" untuk tipe "${type}" sudah terdaftar.`
        });
      }

      const newCategory = await CategoryModel.create(userId, { name, type });

      res.status(201).json({
        success: true,
        message: 'Kategori kustom berhasil ditambahkan.',
        data: newCategory
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Mengubah nama kategori kustom milik user
   * PUT /api/categories/:id
   */
  async updateCategory(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { name } = req.body;

      // Ambil kategori untuk cek apakah miliknya
      const category = await CategoryModel.getById(id, userId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: `Kategori kustom dengan ID ${id} tidak ditemukan atau merupakan kategori bawaan.`
        });
      }

      // Cek apakah nama baru bertabrakan dengan kategori lain
      if (name.toLowerCase() !== category.name.toLowerCase()) {
        const exists = await CategoryModel.existsByNameAndType(userId, name, category.type);
        if (exists) {
          return res.status(400).json({
            success: false,
            message: `Kategori "${name}" untuk tipe "${category.type}" sudah terdaftar.`
          });
        }
      }

      const result = await CategoryModel.update(id, userId, name);

      // Kosongkan cache analitik karena nama kategori di transaksi/budget berubah
      await cacheEngine.deleteByPrefix(`analysis:${userId}:`);

      res.json({
        success: true,
        message: 'Kategori kustom berhasil diubah nama dan disinkronisasikan.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Menghapus kategori kustom milik user
   * DELETE /api/categories/:id
   */
  async deleteCategory(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      // Ambil kategori untuk cek apakah miliknya
      const category = await CategoryModel.getById(id, userId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: `Kategori kustom dengan ID ${id} tidak ditemukan atau merupakan kategori bawaan.`
        });
      }

      const isDeleted = await CategoryModel.delete(id, userId);
      if (!isDeleted) {
        return res.status(404).json({
          success: false,
          message: 'Kategori kustom tidak berhasil dihapus.'
        });
      }

      // Kosongkan cache analitik karena data kategori di transaksi/budget dipindahkan ke 'Lain-lain'
      await cacheEngine.deleteByPrefix(`analysis:${userId}:`);

      res.json({
        success: true,
        message: `Kategori kustom "${category.name}" berhasil dihapus dan seluruh transaksi/anggaran terkait dipindahkan ke "Lain-lain".`
      });
    } catch (error) {
      next(error);
    }
  }
};

export default CategoryController;
