#!/usr/bin/env node

/**
 * 用戶帳號管理腳本
 * 用於恢復正常用戶帳號和管理測試資料
 */

const { Pool } = require('pg');
require('dotenv').config();

// 數據庫連接配置
const getDbConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    };
  } else {
    return {
      host: 'localhost',
      port: 5432,
      database: 'bci_business_club',
      user: 'xuan',
      password: ''
    };
  }
};

const pool = new Pool(getDbConfig());

/**
 * 搜索用戶
 * @param {string} searchTerm - 搜索關鍵詞
 * @returns {Array} - 匹配的用戶列表
 */
async function searchUsers(searchTerm) {
  try {
    const result = await pool.query(
      `SELECT id, name, email, status, membership_level, chapter_id, created_at 
       FROM users 
       WHERE name ILIKE $1 OR email ILIKE $1 
       ORDER BY name`,
      [`%${searchTerm}%`]
    );
    
    return result.rows;
  } catch (error) {
    console.error('搜索用戶錯誤:', error.message);
    return [];
  }
}

/**
 * 恢復用戶帳號狀態
 * @param {number} userId - 用戶ID
 * @param {string} status - 新狀態
 */
async function restoreUserAccount(userId, status = 'active') {
  try {
    const result = await pool.query(
      'UPDATE users SET status = $1 WHERE id = $2 RETURNING *',
      [status, userId]
    );
    
    if (result.rows.length > 0) {
      console.log(`✅ 用戶帳號已恢復: ${result.rows[0].name} (${result.rows[0].email}) -> ${status}`);
      return result.rows[0];
    } else {
      console.log(`❌ 未找到用戶 ID: ${userId}`);
      return null;
    }
  } catch (error) {
    console.error('恢復用戶帳號錯誤:', error.message);
    return null;
  }
}

/**
 * 列出所有用戶
 */
async function listAllUsers() {
  try {
    const result = await pool.query(
      `SELECT id, name, email, status, membership_level, chapter_id 
       FROM users 
       ORDER BY name`
    );
    
    console.log('\n=== 所有用戶列表 ===');
    result.rows.forEach(user => {
      console.log(`ID: ${user.id}, 姓名: ${user.name}, 郵箱: ${user.email}, 狀態: ${user.status}, 會員等級: ${user.membership_level}, 分會ID: ${user.chapter_id}`);
    });
    
    return result.rows;
  } catch (error) {
    console.error('列出用戶錯誤:', error.message);
    return [];
  }
}

/**
 * 檢查指定用戶
 */
async function checkSpecificUsers() {
  const targetUsers = ['余明哲', '詹芸妡'];
  
  console.log('\n=== 檢查指定用戶 ===');
  
  for (const userName of targetUsers) {
    console.log(`\n搜索用戶: ${userName}`);
    
    // 精確匹配
    const exactMatch = await pool.query(
      'SELECT * FROM users WHERE name = $1',
      [userName]
    );
    
    if (exactMatch.rows.length > 0) {
      console.log(`✅ 找到精確匹配:`);
      exactMatch.rows.forEach(user => {
        console.log(`  ID: ${user.id}, 姓名: ${user.name}, 郵箱: ${user.email}, 狀態: ${user.status}`);
      });
    } else {
      console.log(`❌ 未找到精確匹配`);
      
      // 模糊搜索
      const fuzzyResults = await searchUsers(userName);
      if (fuzzyResults.length > 0) {
        console.log(`🔍 模糊搜索結果:`);
        fuzzyResults.forEach(user => {
          console.log(`  ID: ${user.id}, 姓名: ${user.name}, 郵箱: ${user.email}, 狀態: ${user.status}`);
        });
      } else {
        console.log(`❌ 模糊搜索也未找到相關用戶`);
      }
    }
  }
}

/**
 * 主函數
 */
async function main() {
  const command = process.argv[2];
  
  console.log('=== 用戶帳號管理工具 ===');
  console.log(`環境: ${process.env.NODE_ENV || 'development'}`);
  
  try {
    switch (command) {
      case 'check':
        await checkSpecificUsers();
        break;
        
      case 'list':
        await listAllUsers();
        break;
        
      case 'search':
        const searchTerm = process.argv[3];
        if (!searchTerm) {
          console.log('請提供搜索關鍵詞: node scripts/manage-user-accounts.js search <關鍵詞>');
          break;
        }
        const results = await searchUsers(searchTerm);
        console.log(`\n搜索 "${searchTerm}" 的結果:`);
        results.forEach(user => {
          console.log(`ID: ${user.id}, 姓名: ${user.name}, 郵箱: ${user.email}, 狀態: ${user.status}`);
        });
        break;
        
      case 'restore':
        const userId = process.argv[3];
        const status = process.argv[4] || 'active';
        if (!userId) {
          console.log('請提供用戶ID: node scripts/manage-user-accounts.js restore <用戶ID> [狀態]');
          break;
        }
        await restoreUserAccount(parseInt(userId), status);
        break;
        
      default:
        console.log(`
使用方法:
  node scripts/manage-user-accounts.js check     - 檢查指定用戶（余明哲、詹芸妡）
  node scripts/manage-user-accounts.js list      - 列出所有用戶
  node scripts/manage-user-accounts.js search <關鍵詞> - 搜索用戶
  node scripts/manage-user-accounts.js restore <用戶ID> [狀態] - 恢復用戶帳號
        `);
    }
  } catch (error) {
    console.error('執行錯誤:', error.message);
  } finally {
    await pool.end();
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  main();
}

module.exports = {
  searchUsers,
  restoreUserAccount,
  listAllUsers,
  checkSpecificUsers
};