import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});

// Verify tables exist on startup
(async () => {
  try {
    const conn = await pool.getConnection();
    await conn.query('SELECT 1 FROM users LIMIT 1');
    await conn.query('SELECT 1 FROM attendance_records LIMIT 1');
    await conn.query('SELECT 1 FROM system_logs LIMIT 1');
    conn.release();
    console.log('✅  Database connected and tables verified');
  } catch (err) {
    console.error('❌  Database error:', err.message);
    process.exit(1);
  }
})();

export default pool;