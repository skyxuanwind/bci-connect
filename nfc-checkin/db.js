const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 資料庫檔案路徑
const dbPath = path.join(__dirname, 'attendance.db');

// 建立資料庫連線
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('資料庫連線錯誤:', err.message);
  } else {
    console.log('✅ SQLite 資料庫連線成功');
  }
});

// 建立 attendance 資料表
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_uid TEXT NOT NULL,
      checkin_time DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('建立資料表錯誤:', err.message);
    } else {
      console.log('✅ attendance 資料表已準備就緒');
    }
  });
});

// 新增報到紀錄
function addCheckin(cardUid, callback) {
  const stmt = db.prepare('INSERT INTO attendance (card_uid) VALUES (?)');
  stmt.run(cardUid, function(err) {
    if (err) {
      console.error('新增報到紀錄錯誤:', err.message);
      callback(err, null);
    } else {
      console.log(`✅ 卡號 ${cardUid} 報到成功，ID: ${this.lastID}`);
      callback(null, this.lastID);
    }
  });
  stmt.finalize();
}

// 取得最後一筆報到紀錄
function getLastCheckin(callback) {
  db.get(`
    SELECT id, card_uid, checkin_time 
    FROM attendance 
    ORDER BY id DESC 
    LIMIT 1
  `, (err, row) => {
    if (err) {
      console.error('查詢最後報到紀錄錯誤:', err.message);
      callback(err, null);
    } else {
      callback(null, row);
    }
  });
}

// 取得所有報到紀錄
function getAllCheckins(callback) {
  db.all(`
    SELECT id, card_uid, checkin_time 
    FROM attendance 
    ORDER BY id DESC
  `, (err, rows) => {
    if (err) {
      console.error('查詢所有報到紀錄錯誤:', err.message);
      callback(err, null);
    } else {
      callback(null, rows);
    }
  });
}

// 關閉資料庫連線
function closeDatabase() {
  db.close((err) => {
    if (err) {
      console.error('關閉資料庫錯誤:', err.message);
    } else {
      console.log('✅ 資料庫連線已關閉');
    }
  });
}

module.exports = {
  addCheckin,
  getLastCheckin,
  getAllCheckins,
  closeDatabase
};

// 程式結束時關閉資料庫
process.on('SIGINT', () => {
  console.log('\n正在關閉資料庫...');
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n正在關閉資料庫...');
  closeDatabase();
  process.exit(0);
});