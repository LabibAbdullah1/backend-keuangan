import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'keuangan_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
};

// Create the connection pool
export const pool = mysql.createPool(dbConfig);

// Helper function to test the pool connection
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Terkoneksi dengan aman ke MySQL database: ${dbConfig.database} di ${dbConfig.host}:${dbConfig.port}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('[Database Error] Gagal menyambung ke MySQL database:', error.message);
    throw error;
  }
}
