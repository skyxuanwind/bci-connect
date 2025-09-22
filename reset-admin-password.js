const { pool } = require('./config/database');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@bci-club.com').toLowerCase();
  const newPassword = process.env.NEW_ADMIN_PASSWORD || 'admin123456';
  const saltRounds = 12;

  try {
    console.log('🔐 重置/建立管理員帳號...');
    console.log(`📧 目標管理員 Email: ${adminEmail}`);

    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // 先嘗試更新既有管理員帳號
    const updateSql = `
      UPDATE users 
      SET password = $1, membership_level = 1, status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE email = $2
      RETURNING id, name, email, membership_level, status
    `;

    const updateRes = await pool.query(updateSql, [hashedPassword, adminEmail]);

    if (updateRes.rows.length > 0) {
      const u = updateRes.rows[0];
      console.log('✅ 已更新現有管理員帳號');
      console.log(`   - ID: ${u.id}`);
      console.log(`   - Email: ${u.email}`);
      console.log(`   - membership_level: ${u.membership_level}`);
      console.log(`   - status: ${u.status}`);
    } else {
      // 若不存在則插入一筆新的管理員帳號
      const insertSql = `
        INSERT INTO users (name, email, password, company, industry, title, membership_level, status, created_at)
        VALUES ('系統管理員', $1, $2, 'GBC', '系統管理', '管理員', 1, 'active', CURRENT_TIMESTAMP)
        ON CONFLICT (email) DO UPDATE 
          SET password = EXCLUDED.password,
              membership_level = 1,
              status = 'active',
              updated_at = CURRENT_TIMESTAMP
        RETURNING id, name, email, membership_level, status
      `;
      const insertRes = await pool.query(insertSql, [adminEmail, hashedPassword]);
      const u = insertRes.rows[0];
      console.log('✅ 已建立/更新管理員帳號');
      console.log(`   - ID: ${u.id}`);
      console.log(`   - Email: ${u.email}`);
      console.log(`   - membership_level: ${u.membership_level}`);
      console.log(`   - status: ${u.status}`);
    }

    console.log('🔑 管理員新密碼已設定：', newPassword);
    console.log('⚠️ 請妥善保管，必要時可使用環境變數 NEW_ADMIN_PASSWORD 指定密碼再執行一次。');
  } catch (error) {
    console.error('❌ 重置管理員密碼失敗:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

resetAdminPassword();