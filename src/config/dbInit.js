const pool = require('./db');
require('dotenv').config();

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // 獲取遊戲名稱列表
    const gameNames = process.env.GAME_NAMES.split(',');
    
    // 為每個遊戲創建表格
    for (const gameName of gameNames) {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS ${gameName} (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          nickname VARCHAR(100),
          department VARCHAR(100),
          score INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await client.query(createTableQuery);
    }

    console.log('Database tables initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = initializeDatabase;
