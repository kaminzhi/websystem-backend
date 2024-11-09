require('dotenv').config();
const express = require('express');
const initializeDatabase = require('./config/dbInit');
const playerRoutes = require('./routes/players');
const csvRouter = require('./routes/csv');
const gamesRouter = require('./routes/games');

const app = express();

app.use(express.json());

// 初始化數據庫
initializeDatabase().then(() => {
  console.log('Database initialized');
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// 使用路由
app.use('/api/players', playerRoutes);
app.use('/api/csv', csvRouter);
app.use('/api/games', gamesRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
