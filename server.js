import app from './app.js';
import { testConnection } from './src/config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Fungsi inisialisasi server utama
async function startServer() {
  try {
    // 1. Uji koneksi ke database MySQL sebelum mendengarkan request HTTP
    console.log('[Inisialisasi] Menguji koneksi database...');
    await testConnection();

    // 2. Mulai server Express
    app.listen(PORT, () => {
      console.log('============================================================');
      console.log(`[Server] Keuangan Backend aktif secara real-time!`);
      console.log(`[Status] Mendengarkan port: ${PORT}`);
      console.log(`[Mode] Running in ${process.env.NODE_ENV || 'production'} mode`);
      console.log(`[Akses] Hubungkan frontend Anda ke http://localhost:${PORT}`);
      console.log('============================================================');
    });

  } catch (error) {
    console.error('============================================================');
    console.error('[Gagal Inisialisasi] Aplikasi tetap dijalankan agar Anda bisa mengonfigurasi database.');
    console.error('[Error] DB Credential salah atau MySQL server mati:', error.message);
    console.error('============================================================');

    // Tetap hidupkan Express listener agar cPanel Setup Node.js App tidak mendeteksi crash
    // Ini membantu pengguna mengakses status/error log via HTTP daripada server mati total.
    app.listen(PORT, () => {
      console.log(`[Server Resilien] Aktif di Port: ${PORT} (Database Terputus)`);
    });
  }
}

startServer();
