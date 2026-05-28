import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import apiRouter from './src/routes/api.js';
import authRouter from './src/routes/auth.js';
import errorHandler from './src/middlewares/errorHandler.js';

dotenv.config();

const app = express();

// ==========================================
// 1. KEAMANAN & MIDDLEWARES UTAMA
// ==========================================
// Helmet untuk mengamankan HTTP Headers
app.use(helmet());

// Konfigurasi CORS yang aman dan fleksibel untuk frontend React
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Izinkan request tanpa origin (seperti mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Akses diblokir oleh kebijakan CORS server.'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CRON-KEY'],
  credentials: true
}));

// Body parser untuk data JSON murni
app.use(express.json());

// Logger sederhana untuk memantau request masuk di console (sangat berguna untuk debugging)
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});

// Pembatasan laju request (Rate Limiting) untuk mencegah serangan DoS & brute-force
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 100, // Maksimal 100 request per menit dari satu IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak permintaan dari IP Anda, silakan coba lagi setelah satu menit.'
  }
});
app.use('/api', limiter);

// ==========================================
// 2. INTEGRASI RUTE UTAMA (API PATHS)
// ==========================================
// Rute status server utama (Berguna untuk cPanel setup checking dan Diagnostik Database)
app.get('/', async (req, res) => {
  let dbStatus = { connected: false, error: null, tables: [], usersCount: 0, transactionsCount: 0 };
  try {
    const { pool } = await import('./src/config/db.js');
    const connection = await pool.getConnection();
    dbStatus.connected = true;
    
    // Get tables
    const [rows] = await connection.query('SHOW TABLES;');
    dbStatus.tables = rows.map(r => Object.values(r)[0]);
    
    // Get users count
    try {
      const [users] = await connection.query('SELECT COUNT(*) as count FROM users;');
      dbStatus.usersCount = users[0].count;
    } catch (uErr) {
      dbStatus.usersError = uErr.message;
    }

    // Get transactions count
    try {
      const [transactions] = await connection.query('SELECT COUNT(*) as count FROM transactions;');
      dbStatus.transactionsCount = transactions[0].count;
    } catch (tErr) {
      dbStatus.transactionsError = tErr.message;
    }

    connection.release();
  } catch (err) {
    dbStatus.error = err.message;
  }

  res.json({
    success: true,
    message: 'Personal Finance API Server berjalan dengan sehat dan aman.',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    api_documentation: '/api/transactions'
  });
});

// Bind modular routes
app.use('/api/auth', authRouter);
app.use('/api', apiRouter);

// ==========================================
// 3. ERROR HANDLERS (Try-Catch fallback)
// ==========================================
// Handler Rute Tidak Ditemukan (404 Not Found)
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Rute API '${req.originalUrl}' tidak ditemukan.`
  });
});

// Centralized error handling middleware
app.use(errorHandler);

export default app;
