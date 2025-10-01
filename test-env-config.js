// 測試環境變數配置
require('dotenv').config();

console.log('=== 環境變數配置檢查 ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('CLIENT_URL:', process.env.CLIENT_URL);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('QR_CODE_BASE_URL:', process.env.QR_CODE_BASE_URL);
console.log('BACKEND_URL:', process.env.BACKEND_URL);

// 模擬邀請連結生成邏輯
function generateInviteLink(eventId, inviterId, req = null) {
  let frontendBase;
  
  // 1. 優先使用環境變數 FRONTEND_URL
  if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.trim()) {
    frontendBase = process.env.FRONTEND_URL.trim().replace(/\/$/, '');
    console.log('使用 FRONTEND_URL 環境變數:', frontendBase);
  }
  // 2. 如果沒有設置 FRONTEND_URL，使用預設值
  else {
    frontendBase = 'https://www.gbc-connect.com';
    console.log('使用預設值:', frontendBase);
  }
  
  const inviteLink = `${frontendBase}/guest-registration?event_id=${eventId}&inviter_id=${inviterId}`;
  
  return inviteLink;
}

// 測試邀請連結生成
const testLink = generateInviteLink(10, 8);
console.log('=== 測試邀請連結 ===');
console.log('生成的邀請連結:', testLink);