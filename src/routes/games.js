const express = require('express');
const router = express.Router();
require('dotenv').config();

// 獲取遊戲列表
router.get('/', (req, res) => {
  try {
    const gameNames = process.env.GAME_NAMES.split(',');
    const gameDisplayNames = process.env.GAME_DISPLAY_NAMES.split(',');
    
    const games = gameNames.map((name, index) => ({
      id: name,
      name: name,
      displayName: gameDisplayNames[index] || name.replace('game_', '遊戲')
    }));
    
    res.json(games);
  } catch (err) {
    console.error('Error getting games list:', err);
    res.status(500).json({ message: '服務器錯誤' });
  }
});

module.exports = router; 