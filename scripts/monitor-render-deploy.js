#!/usr/bin/env node

/**
 * 監控 Render 部署是否已生效（以會員目錄搜尋驗證）
 * 每30秒檢查一次，最多10次。
 */

const axios = require('axios');

const API = 'https://www.gbc-connect.com';
const SEARCH_NAME = '詹芸妡';
const INTERVAL_MS = 30000; // 30秒
const MAX_TRIES = 10;

let headers = null;
let tries = 0;

async function login() {
  try {
    const r = await axios.post(`${API}/api/auth/login`, {
      email: 'admin@bci-club.com',
      password: 'admin123456'
    });
    headers = { Authorization: 'Bearer ' + r.data.token };
    console.log('🔑 Login ok');
  } catch (e) {
    console.log('❌ Login failed', e.response?.status || e.message);
    process.exit(1);
  }
}

async function check() {
  tries++;
  try {
    const r = await axios.get(`${API}/api/users/members`, {
      headers,
      params: { page: 1, limit: 50, search: SEARCH_NAME }
    });
    const total = (r.data && r.data.pagination && r.data.pagination.totalMembers) || 0;
    const ts = new Date().toISOString();
    console.log(`[${ts}] ${SEARCH_NAME} search total=${total}`);
    if (total > 0) {
      console.log('✅ 部署已生效：搜尋結果返回目標會員');
      process.exit(0);
    }
    if (tries >= MAX_TRIES) {
      console.log('⏳ 超過最大嘗試次數，請稍後在 Render 檢查部署狀態');
      process.exit(2);
    }
  } catch (e) {
    console.log('❗ Check error', e.response?.status || e.message);
  }
}

(async () => {
  await login();
  await check();
  setInterval(check, INTERVAL_MS);
})();