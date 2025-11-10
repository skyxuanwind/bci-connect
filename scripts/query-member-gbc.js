#!/usr/bin/env node

/**
 * 查詢生產環境（https://www.gbc-connect.com）指定會員的狀態與可見性
 *
 * 使用方式：
 *   node scripts/query-member-gbc.js --email emma413413410@gmail.com --name 詹芸妡
 *
 * 可覆寫環境變數：
 *   ADMIN_EMAIL, ADMIN_PASSWORD, GBC_API_URL
 */

const axios = require('axios');

const API = process.env.GBC_API_URL || 'https://www.gbc-connect.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@bci-club.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--email') out.email = args[++i];
    else if (a === '--name') out.name = args[++i];
  }
  return out;
}

async function adminLogin() {
  const resp = await axios.post(`${API}/api/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  const token = resp.data?.token;
  if (!token) throw new Error('Admin login succeeded but no token returned');
  const headers = { Authorization: `Bearer ${token}` };
  return { token, headers, adminUser: resp.data?.user };
}

async function findUserViaAdmin(headers, { email, name }) {
  // 優先使用 search 以 email 精準查找，若沒命中再用 name 查找
  const queries = [];
  if (email) queries.push(email);
  if (name && name !== email) queries.push(name);

  let users = [];
  for (const q of queries) {
    const r = await axios.get(`${API}/api/admin/users`, {
      headers,
      params: { limit: 200, search: q }
    });
    users = users.concat(r.data?.users || []);
  }

  // 去重
  const seen = new Set();
  users = users.filter(u => {
    const key = `${u.id}-${(u.email || '').toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 精準優先：先以 email 精準比對，再以 name 精準比對，最後回傳第一筆
  let exact = null;
  if (email) exact = users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
  if (!exact && name) exact = users.find(u => (u.name || '').trim() === name.trim());
  if (exact || users[0]) return exact || users[0];

  // 失敗回退：做全量分頁掃描（不帶搜尋條件）
  const pageLimit = 500;
  const maxPages = 10; // 掃描至多 10 頁（5,000 筆）
  let page = 1;
  let collected = [];
  while (page <= maxPages) {
    const r = await axios.get(`${API}/api/admin/users`, {
      headers,
      params: { page, limit: pageLimit }
    });
    const batch = r.data?.users || [];
    if (!Array.isArray(batch) || batch.length === 0) break;
    collected = collected.concat(batch);
    if (batch.length < pageLimit) break; // 已到最後一頁
    page++;
  }

  // 全量集合中查找精準匹配
  let found = null;
  if (email) found = collected.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
  if (!found && name) found = collected.find(u => (u.name || '').trim() === name.trim());
  return found || null;
}

async function checkDirectoryVisibility(headers, searchTerm) {
  // 會員目錄只顯示 status=active；此查詢用來驗證是否可見
  try {
    const r = await axios.get(`${API}/api/users/members`, {
      headers,
      params: { page: 1, limit: 50, search: searchTerm }
    });
    return {
      ok: true,
      members: r.data?.members || [],
      pagination: r.data?.pagination || null,
      showTestData: r.data?.showTestData,
      isProduction: r.data?.isProduction
    };
  } catch (e) {
    return { ok: false, error: e.response?.data || e.message, status: e.response?.status };
  }
}

async function getPublicProfile(userId) {
  try {
    const r = await axios.get(`${API}/api/users/${userId}/public`);
    return { ok: true, data: r.data };
  } catch (e) {
    return { ok: false, error: e.response?.data || e.message, status: e.response?.status };
  }
}

async function main() {
  const { email, name } = parseArgs();
  if (!email && !name) {
    console.log('請提供查詢條件：--email <email> 或 --name <name>');
    process.exit(1);
  }

  const result = {
    targetQuery: { email: email || null, name: name || null },
    environment: { apiBase: API },
    admin: null,
    user: null,
    directoryCheck: null,
    publicProfile: null,
    analysis: {}
  };

  try {
    // 管理員登入
    const { token, headers, adminUser } = await adminLogin();
    result.admin = { id: adminUser?.id, email: adminUser?.email, name: adminUser?.name };

    // 以管理員查找會員
    const user = await findUserViaAdmin(headers, { email, name });
    if (!user) {
      result.analysis.reason = 'admin_search_not_found_after_paged_scan';
      result.analysis.notes = [
        '已嘗試以 email/name 搜尋，並進行最多 10 頁全量分頁掃描（每頁500筆），仍未命中'
      ];

      // 仍嘗試檢查會員目錄（僅 active 顯示），以確認是否有任何近似匹配
      const searchTerm = email || name;
      if (searchTerm) {
        const directory = await checkDirectoryVisibility(headers, searchTerm);
        result.directoryCheck = directory;
        if (directory.ok) {
          const candidates = (directory.members || []).filter(m => {
            const nameMatch = name ? (m.name || '').trim() === name.trim() : false;
            const emailMatch = email ? (m.email || '').toLowerCase() === email.toLowerCase() : false;
            return nameMatch || emailMatch;
          });
          if (candidates.length > 0) {
            result.analysis.notes.push('會員目錄出現可能候選（僅 active），但管理員列表未命中');
          } else {
            result.analysis.notes.push('會員目錄也未出現任何匹配');
          }
        } else {
          result.analysis.notes.push(`會員目錄查詢失敗或需要認證；status=${directory.status}`);
        }
      }

      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    }
    result.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      membershipLevel: user.membershipLevel || user.membership_level,
      chapterName: user.chapterName || user.chapter_name,
      isCoach: !!user.isCoach || !!user.is_coach,
      coachUserId: user.coachUserId || user.coach_user_id,
      createdAt: user.createdAt || null,
      profilePictureUrl: user.profilePictureUrl || user.profile_picture_url || null
    };

    // 檢查是否出現在會員目錄（僅 active 顯示）
    const searchTerm = email || name || user.name || user.email;
    const directory = await checkDirectoryVisibility(headers, searchTerm);
    result.directoryCheck = directory;

    // 取得公開檔案（不需登入）
    const pub = await getPublicProfile(user.id);
    result.publicProfile = pub;

    // 分析可見性與篩選條件影響
    const appearsInDirectory = directory.ok && (directory.members || []).some(m => {
      const me = (m.name || '').trim() === (user.name || '').trim();
      const ee = (m.email || '').toLowerCase() === (user.email || '').toLowerCase();
      return me || ee;
    });

    const analysis = {
      appearsInDirectory,
      visibilityRules: {
        mustBeActive: true,
        productionFiltersExcludeTests: true,
        adminUserExcluded: true
      },
      probableLoginMethod: '帳密登入（電子郵件＋密碼）',
      notes: []
    };

    if (result.user.status !== 'active') {
      analysis.notes.push('會員狀態非 active，目錄不會顯示');
    }

    // 生產環境過濾規則（不影響此目標用戶，僅備註）
    analysis.notes.push('正式環境會排除測試資料（email/name/company 含 test/測試/example 等）');

    result.analysis = analysis;
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('查詢過程錯誤:', e.response?.data || e.message);
    process.exit(1);
  }
}

main();