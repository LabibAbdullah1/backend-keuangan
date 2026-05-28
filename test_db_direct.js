import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'keuangan_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
};

async function diagnostic() {
  console.log('--- Database Diagnostics Start ---');
  console.log('Connecting to database using config:', {
    host: dbConfig.host,
    user: dbConfig.user,
    database: dbConfig.database,
    port: dbConfig.port,
    hasPassword: !!dbConfig.password
  });

  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('[SUCCESS] Connected to MySQL database successfully!');
    
    // Check tables
    const [tables] = await connection.query('SHOW TABLES;');
    console.log('Tables found in database:', tables.map(t => Object.values(t)[0]));

    // Check users
    try {
      const [users] = await connection.query('SELECT id, username, email FROM users;');
      console.log(`[SUCCESS] Read users: ${users.length} user(s) found.`);
      console.log('Users list:', users);
    } catch (e) {
      console.error('[ERROR] Failed to query users table:', e.message);
    }

    // Check transactions
    try {
      const [transactions] = await connection.query('SELECT id, user_id, type, amount, category, date, note FROM transactions;');
      console.log(`[SUCCESS] Read transactions: ${transactions.length} transaction(s) found.`);
      if (transactions.length > 0) {
        console.log('Recent 5 transactions:', transactions.slice(-5));
      }
    } catch (e) {
      console.error('[ERROR] Failed to query transactions table:', e.message);
    }

    await connection.end();
  } catch (error) {
    console.error('[FATAL ERROR] Could not connect to MySQL server:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('-> MySQL server seems to be offline or running on a different port/host.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error(`-> The database "${dbConfig.database}" does not exist. You need to create it first!`);
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('-> Authentication failed. Verify your username and password.');
    }
  }
  console.log('--- Database Diagnostics End ---');
}

diagnostic();
