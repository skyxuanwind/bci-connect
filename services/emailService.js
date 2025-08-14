const nodemailer = require('nodemailer');

// 創建郵件傳輸器
const createTransporter = () => {
  // 檢查必要的環境變數
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('Email configuration missing: SMTP_USER and SMTP_PASS are required');
  }
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    // 添加額外的配置以提高兼容性
    tls: {
      rejectUnauthorized: false
    }
  });
};

// 發送引薦通知Email
const sendReferralNotification = async (type, referralData) => {
  try {
    const transporter = createTransporter();
    
    // 驗證 SMTP 連接
    await transporter.verify();
    console.log('SMTP server connection verified successfully');
    
    let subject, html, to;
    
    if (type === 'new_referral') {
      // 收到新引薦通知
      subject = '您收到了一個新的引薦';
      to = referralData.referred_email;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">您收到了一個新的引薦</h2>
          <p>親愛的 ${referralData.referred_name}，</p>
          <p>${referralData.referrer_name} (${referralData.referrer_company}) 向您發送了一個引薦：</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>引薦金額：</strong>NT$ ${referralData.referral_amount.toLocaleString()}</p>
            <p><strong>說明：</strong>${referralData.description}</p>
          </div>
          <p>請登入系統查看詳情並回應此引薦。</p>
          <a href="${process.env.FRONTEND_URL}/referrals" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">查看引薦</a>
        </div>
      `;
    } else if (type === 'referral_confirmed') {
      // 引薦被確認通知
      subject = '您的引薦已被確認';
      to = referralData.referrer_email;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">您的引薦已被確認</h2>
          <p>親愛的 ${referralData.referrer_name}，</p>
          <p>${referralData.referred_name} 已確認了您的引薦：</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>引薦金額：</strong>NT$ ${referralData.referral_amount.toLocaleString()}</p>
            <p><strong>確認時間：</strong>${new Date().toLocaleString('zh-TW')}</p>
          </div>
          <p>恭喜您成功完成引薦！</p>
          <a href="${process.env.FRONTEND_URL}/referrals" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">查看詳情</a>
        </div>
      `;
    } else if (type === 'referral_rejected') {
      // 引薦被拒絕通知
      subject = '您的引薦已被拒絕';
      to = referralData.referrer_email;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">您的引薦已被拒絕</h2>
          <p>親愛的 ${referralData.referrer_name}，</p>
          <p>${referralData.referred_name} 拒絕了您的引薦：</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>引薦金額：</strong>NT$ ${referralData.referral_amount.toLocaleString()}</p>
            <p><strong>拒絕時間：</strong>${new Date().toLocaleString('zh-TW')}</p>
          </div>
          <a href="${process.env.FRONTEND_URL}/referrals" style="background-color: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">查看詳情</a>
        </div>
      `;
    }
    
    const mailOptions = {
      from: `"BCI商務菁英會" <${process.env.SMTP_USER}>`,
      to: to,
      subject: subject,
      html: html
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`引薦通知Email已發送: ${type} to ${to}`);
  } catch (error) {
    console.error('發送引薦通知Email失敗:', error);
    
    // 提供更詳細的錯誤信息
    if (error.code === 'EAUTH') {
      console.error('SMTP 認證失敗 - 請檢查以下設定:');
      console.error('1. 確認 Gmail 帳戶已啟用兩步驟驗證');
      console.error('2. 使用應用程式密碼而非一般密碼');
      console.error('3. 生成應用程式密碼: https://myaccount.google.com/apppasswords');
      console.error('4. 在 .env 文件中設定正確的 SMTP_USER 和 SMTP_PASS');
    } else if (error.code === 'ECONNECTION') {
      console.error('SMTP 連接失敗 - 請檢查網路連接和 SMTP 設定');
    }
    
    throw error; // 重新拋出錯誤以便上層處理
  }
};

// 發送會議預約通知Email
const sendMeetingNotification = async (type, meetingData) => {
  try {
    const transporter = createTransporter();
    
    // 驗證 SMTP 連接
    await transporter.verify();
    console.log('SMTP server connection verified successfully');
    
    let subject, html, to;
    
    if (type === 'new_meeting') {
      // 收到新會議邀請通知
      subject = '您收到了一個新的會議邀請';
      to = meetingData.attendee_email;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">您收到了一個新的會議邀請</h2>
          <p>親愛的 ${meetingData.attendee_name}，</p>
          <p>${meetingData.requester_name} (${meetingData.requester_company}) 邀請您參加會議：</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>會議時間：</strong>${new Date(meetingData.meeting_time_start).toLocaleString('zh-TW')} - ${new Date(meetingData.meeting_time_end).toLocaleString('zh-TW')}</p>
            <p><strong>備註：</strong>${meetingData.notes || '無'}</p>
          </div>
          <p>請登入系統查看詳情並回應此邀請。</p>
          <a href="${process.env.FRONTEND_URL}/meetings" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">查看邀請</a>
        </div>
      `;
    } else if (type === 'meeting_confirmed') {
      // 會議被確認通知
      subject = '您的會議邀請已被確認';
      to = meetingData.requester_email;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">您的會議邀請已被確認</h2>
          <p>親愛的 ${meetingData.requester_name}，</p>
          <p>${meetingData.attendee_name} 已確認了您的會議邀請：</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>會議時間：</strong>${new Date(meetingData.meeting_time_start).toLocaleString('zh-TW')} - ${new Date(meetingData.meeting_time_end).toLocaleString('zh-TW')}</p>
            <p><strong>確認時間：</strong>${new Date().toLocaleString('zh-TW')}</p>
          </div>
          <p>請準時參加會議！</p>
          <a href="${process.env.FRONTEND_URL}/meetings" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">查看詳情</a>
        </div>
      `;
    } else if (type === 'meeting_cancelled') {
      // 會議被取消通知
      subject = '您的會議邀請已被取消';
      to = meetingData.requester_email;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">您的會議邀請已被取消</h2>
          <p>親愛的 ${meetingData.requester_name}，</p>
          <p>${meetingData.attendee_name} 取消了您的會議邀請：</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>原定會議時間：</strong>${new Date(meetingData.meeting_time_start).toLocaleString('zh-TW')} - ${new Date(meetingData.meeting_time_end).toLocaleString('zh-TW')}</p>
            <p><strong>取消時間：</strong>${new Date().toLocaleString('zh-TW')}</p>
          </div>
          <a href="${process.env.FRONTEND_URL}/meetings" style="background-color: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">查看詳情</a>
        </div>
      `;
    }
    
    const mailOptions = {
      from: `"BCI商務菁英會" <${process.env.SMTP_USER}>`,
      to: to,
      subject: subject,
      html: html
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`會議通知Email已發送: ${type} to ${to}`);
  } catch (error) {
    console.error('發送會議通知Email失敗:', error);
    
    // 提供更詳細的錯誤信息
    if (error.code === 'EAUTH') {
      console.error('SMTP 認證失敗 - 請檢查以下設定:');
      console.error('1. 確認 Gmail 帳戶已啟用兩步驟驗證');
      console.error('2. 使用應用程式密碼而非一般密碼');
      console.error('3. 生成應用程式密碼: https://myaccount.google.com/apppasswords');
      console.error('4. 在 .env 文件中設定正確的 SMTP_USER 和 SMTP_PASS');
    } else if (error.code === 'ECONNECTION') {
      console.error('SMTP 連接失敗 - 請檢查網路連接和 SMTP 設定');
    }
    
    throw error; // 重新拋出錯誤以便上層處理
  }
};

module.exports = {
  sendReferralNotification,
  sendMeetingNotification
};