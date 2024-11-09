const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parse } = require('csv-parse');
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const pool = require('../config/db');

const upload = multer({ dest: 'uploads/' });

// 獲取上傳目錄中的所有文件
async function getUploadedFiles() {
  const uploadDir = path.join(__dirname, '..', '..', 'uploads');
  return await fsPromises.readdir(uploadDir);
}

// 刪除舊文件
async function deleteOldFiles(currentFile) {
  const files = await getUploadedFiles();
  const uploadDir = path.join(__dirname, '..', '..', 'uploads');
  for (const file of files) {
    if (file !== currentFile) {
      await fsPromises.unlink(path.join(uploadDir, file));
    }
  }
}

// 清空所有遊戲相關表格的數據並重置 ID
async function clearAllGameTables(client) {
  const { rows } = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name LIKE '%game%'
  `);

  const gameTables = rows.map(row => row.table_name);

  for (const tableName of gameTables) {
    await client.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY`);
  }

  console.log(`已清空 ${gameTables.length} 個遊戲相關表格的數據並重置 ID`);
}

// 檢查 CSV 內的重複名字
function checkDuplicateNamesInCSV(results) {
  const names = new Set();
  const duplicates = [];

  // 從第二行開始，跳過標題行
  for (let i = 1; i < results.length; i++) {
    const name = results[i][0]; // 假設 Name 是第一列
    if (names.has(name)) {
      duplicates.push(`在 CSV 文件中發現重複的名字: ${name} (第 ${i + 1} 行)`);
    } else {
      names.add(name);
    }
  }

  return duplicates;
}

// CSV導入路由
router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('沒有上傳文件。');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const results = await new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(req.file.path)
        .pipe(parse())
        .on('data', (data) => results.push(data))
        .on('error', reject)
        .on('end', () => resolve(results));
    });

    // 檢查 CSV 內的重複名字
    const duplicates = checkDuplicateNamesInCSV(results);
    
    if (duplicates.length > 0) {
      const errorMessage = 'CSV 文件中發現重複的名字，上傳失敗:\n' + duplicates.join('\n') + '\n請修正 CSV 文件後重新上傳。';
      throw new Error(errorMessage);
    }

    // 獲取所有包含 "game" 的表格名稱
    const { rows } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE '%game%'
    `);
    const gameTables = rows.map(row => row.table_name);

    // 清空所有遊戲相關表格的數據並重置 ID
    await clearAllGameTables(client);

    // 處理並插入新數據
    await processResults(client, results, gameTables);
    
    await client.query('COMMIT');

    // 刪除舊文件
    await deleteOldFiles(req.file.filename);

    res.status(200).send(`CSV 成功導入到 ${results.length - 1} 條記錄`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('處理 CSV 時發生錯誤:', error);
    res.status(500).send(`處理 CSV 數據時發生錯誤: ${error.message}`);
  } finally {
    client.release();
    // 刪除當前上傳的文件
    await fsPromises.unlink(req.file.path);
  }
});

async function processResults(client, results, gameTables) {
  // 假設CSV的格式是: Name,Nickname,Department
  for (let i = 1; i < results.length; i++) {
    const row = results[i];
    const name = row[0];
    const nickname = row[1] || null;
    const department = row[2] || null;

    for (const tableName of gameTables) {
      try {
        await client.query(
          `INSERT INTO ${tableName} (name, score, nickname, department) VALUES ($1, $2, $3, $4)`,
          [name, 0, nickname, department]
        );
      } catch (error) {
        throw new Error(`插入數據到表 ${tableName} 時出錯: ${error.message}。行: ${i + 1}, 名字: ${name}, 暱稱: ${nickname}, 系級: ${department}`);
      }
    }
  }
}

module.exports = router;
