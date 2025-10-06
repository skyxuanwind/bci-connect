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
    },
    // 更詳細的SMTP除錯日誌（預設僅在非生產環境啟用）
    logger: process.env.SMTP_DEBUG === 'true' || process.env.NODE_ENV !== 'production',
    debug: process.env.SMTP_DEBUG === 'true' || process.env.NODE_ENV !== 'production'
  });
};

// 生成6位數驗證碼
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 發送Email驗證碼
const sendEmailVerification = async ({ email, name, verificationCode }) => {
  try {
    const transporter = createTransporter();
    
    // 驗證 SMTP 連接
    await transporter.verify();
    console.log('SMTP server connection verified successfully');
    
    const mailOptions = {
      from: `"GBC商務菁英會" <${process.env.SMTP_USER}>`,
      to: email,
      bcc: process.env.SMTP_BCC || process.env.SMTP_USER,
      subject: 'GBC Connect - Email驗證碼',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin: 0;">GBC Connect</h1>
              <p style="color: #7f8c8d; margin: 5px 0 0 0;">Email驗證</p>
            </div>
            
            <div style="margin-bottom: 30px;">
              <p style="color: #2c3e50; font-size: 16px; line-height: 1.6;">親愛的 ${name}，</p>
              <p style="color: #2c3e50; font-size: 16px; line-height: 1.6;">感謝您註冊 GBC 商務菁英會！請使用以下驗證碼完成Email驗證：</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; background-color: #3498db; color: white; padding: 20px 40px; border-radius: 10px; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
                ${verificationCode}
              </div>
            </div>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">⚠️ 此驗證碼將在10分鐘後失效，請盡快完成驗證。</p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
              <p style="color: #7f8c8d; font-size: 14px; line-height: 1.6;">如果您沒有註冊 GBC Connect 帳號，請忽略此郵件。</p>
            </div>
            
            <div style="margin-top: 30px; text-align: center;">
              <p style="color: #7f8c8d; font-size: 12px;">此郵件由 GBC Connect 系統自動發送，請勿回覆。</p>
            </div>
          </div>
        </div>
      `
    };
    
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Verification email sendMail result:', {
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
        messageId: info.messageId
      });

      // 若部份收件者被拒絕，嘗試將副本寄送到備援信箱
      if (info.rejected && info.rejected.length > 0) {
        const fallback = process.env.SMTP_BCC;
        if (fallback && !info.accepted.includes(fallback)) {
          console.warn('Primary recipient rejected. Sending fallback copy to SMTP_BCC:', fallback);
          await transporter.sendMail({
            from: `"GBC商務菁英會" <${process.env.SMTP_USER}>`,
            to: fallback,
            subject: '【副本】GBC Connect - Email驗證碼（原收件者被拒絕）',
            html: `<p>原收件者：${email}</p>` + mailOptions.html
          });
        }
      }
    } catch (sendErr) {
      console.error('發送Email驗證碼失敗（主送）:', sendErr);
      // 失敗時嘗試寄送到備援信箱，方便追蹤
      const fallback = process.env.SMTP_BCC;
      if (fallback) {
        try {
          await transporter.sendMail({
            from: `"GBC商務菁英會" <${process.env.SMTP_USER}>`,
            to: fallback,
            subject: '【副本】GBC Connect - Email驗證碼（主送失敗）',
            html: `<p>原收件者：${email}</p>` + mailOptions.html
          });
          console.log('已將驗證碼副本寄送至備援信箱（主送失敗後的備援）：', fallback);
        } catch (fallbackErr) {
          console.error('備援信箱寄送也失敗：', fallbackErr);
        }
      }
      throw sendErr; // 讓上層路由感知錯誤
    }

    console.log(`Email驗證碼已發送至: ${email}`);
  } catch (error) {
    console.error('發送Email驗證碼失敗:', error);
    throw error;
  }
};

// 發送AI智慧通知
const sendAINotification = async ({ email, name, notificationType, content }) => {
  try {
    const transporter = createTransporter();
    
    // 驗證 SMTP 連接
    await transporter.verify();
    console.log('SMTP server connection verified successfully');
    
    let subject, html;
    
    switch (notificationType) {
      case 'business_match':
        subject = 'GBC Connect - AI智慧商務配對通知';
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2c3e50; margin: 0;">🤖 AI智慧配對</h1>
                <p style="color: #7f8c8d; margin: 5px 0 0 0;">為您找到了潛在的商務夥伴</p>
              </div>
              
              <div style="margin-bottom: 30px;">
                <p style="color: #2c3e50; font-size: 16px; line-height: 1.6;">親愛的 ${name}，</p>
                <p style="color: #2c3e50; font-size: 16px; line-height: 1.6;">我們的AI系統為您分析了最新的商務機會：</p>
              </div>
              
              <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                ${content}
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">查看詳情</a>
              </div>
            </div>
          </div>
        `;
        break;
        
      case 'event_recommendation':
        subject = 'GBC Connect - AI活動推薦';
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2c3e50; margin: 0;">🎯 AI活動推薦</h1>
                <p style="color: #7f8c8d; margin: 5px 0 0 0;">為您推薦合適的活動</p>
              </div>
              
              <div style="margin-bottom: 30px;">
                <p style="color: #2c3e50; font-size: 16px; line-height: 1.6;">親愛的 ${name}，</p>
                <p style="color: #2c3e50; font-size: 16px; line-height: 1.6;">根據您的興趣和專業領域，我們為您推薦以下活動：</p>
              </div>
              
              <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                ${content}
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/events" style="display: inline-block; background-color: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">查看活動</a>
              </div>
            </div>
          </div>
        `;
        break;
        
      default:
        subject = 'GBC Connect - AI智慧通知';
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2c3e50; margin: 0;">🔔 智慧通知</h1>
                <p style="color: #7f8c8d; margin: 5px 0 0 0;">來自GBC Connect的智慧提醒</p>
              </div>
              
              <div style="margin-bottom: 30px;">
                <p style="color: #2c3e50; font-size: 16px; line-height: 1.6;">親愛的 ${name}，</p>
              </div>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                ${content}
              </div>
            </div>
          </div>
        `;
    }
    
    const mailOptions = {
      from: `"GBC商務菁英會" <gbc.notice@gmail.com>`,
      to: email,
      subject: subject,
      html: html
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`AI智慧通知已發送至: ${email}`);
  } catch (error) {
    console.error('發送AI智慧通知失敗:', error);
    throw error;
  }
};

// 發送引薦通知Email
const sendReferralNotification = async (type, referralData) => {
  try {
    const transporter = createTransporter();
    
    // 驗證 SMTP 連接
    await transporter.verify();
    console.log('SMTP server connection verified successfully');
    
    let subject, html, to;
    const frontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://bci-connect.onrender.com' : 'http://localhost:3001');
    
    if (type === 'new_referral') {
      // 收到新引薦通知
      subject = '您收到了一個新的引薦';
      to = referralData.referred_email;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">您收到了一個新的引薦</h2>
          <p>親愛的 ${referralData.referred_name}，</p>
          <p>${referralData.referrer_name} (${referralData.referrer_company}) 向您發送了一個引薦：</p>
          <div style=\"background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;\">
            <p><strong>引薦金額：</strong>NT$ ${referralData.referral_amount.toLocaleString()}</p>
            <p><strong>說明：</strong>${referralData.description}</p>
          </div>
          <p>請登入系統查看詳情並回應此引薦。</p>
          <a href="${frontendUrl}/referrals" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">查看引薦</a>
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
          <div style=\"background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;\">
            <p><strong>引薦金額：</strong>NT$ ${referralData.referral_amount.toLocaleString()}</p>
            <p><strong>確認時間：</strong>${new Date().toLocaleString('zh-TW')}</p>
          </div>
          <p>恭喜您成功完成引薦！</p>
          <a href="${frontendUrl}/referrals" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">查看詳情</a>
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
          <div style=\"background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;\">
            <p><strong>引薦金額：</strong>NT$ ${referralData.referral_amount.toLocaleString()}</p>
            <p><strong>拒絕時間：</strong>${new Date().toLocaleString('zh-TW')}</p>
          </div>
          <a href="${frontendUrl}/referrals" style="background-color: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">查看詳情</a>
        </div>
      `;
    }
    
    const mailOptions = {
      from: `"GBC商務菁英會" <${process.env.SMTP_USER}>`,
      to: to,
      bcc: process.env.SMTP_BCC || process.env.SMTP_USER,
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
    const frontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://bci-connect.onrender.com' : 'http://localhost:3001');
    
    if (type === 'new_meeting') {
      // 收到新交流邀請通知
      subject = '您收到了一個新的交流邀請';
      to = meetingData.attendee_email;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">您收到了一個新的交流邀請</h2>
          <p>親愛的 ${meetingData.attendee_name}，</p>
          <p>${meetingData.requester_name} (${meetingData.requester_company}) 邀請您參加交流：</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>交流時間：</strong>${new Date(meetingData.meeting_time_start).toLocaleString('zh-TW')} - ${new Date(meetingData.meeting_time_end).toLocaleString('zh-TW')}</p>
            <p><strong>備註：</strong>${meetingData.notes || '無'}</p>
          </div>
          <p>請登入系統查看詳情並回應此邀請。</p>
          <a href="${frontendUrl}/meetings" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">查看邀請</a>
        </div>
      `;
    } else if (type === 'meeting_confirmed') {
      // 交流被確認通知
      subject = '您的交流邀請已被確認';
      to = meetingData.requester_email;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">您的交流邀請已被確認</h2>
          <p>親愛的 ${meetingData.requester_name}，</p>
          <p>${meetingData.attendee_name} 已確認了您的交流邀請：</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>交流時間：</strong>${new Date(meetingData.meeting_time_start).toLocaleString('zh-TW')} - ${new Date(meetingData.meeting_time_end).toLocaleString('zh-TW')}</p>
            <p><strong>確認時間：</strong>${new Date().toLocaleString('zh-TW')}</p>
          </div>
          <p>請準時參加交流！</p>
          <a href="${frontendUrl}/meetings" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">查看詳情</a>
        </div>
      `;
    } else if (type === 'meeting_cancelled') {
      // 交流被取消通知
      subject = '您的交流邀請已被取消';
      to = meetingData.requester_email;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">您的交流邀請已被取消</h2>
          <p>親愛的 ${meetingData.requester_name}，</p>
          <p>${meetingData.attendee_name} 取消了您的交流邀請：</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>原定交流時間：</strong>${new Date(meetingData.meeting_time_start).toLocaleString('zh-TW')} - ${new Date(meetingData.meeting_time_end).toLocaleString('zh-TW')}</p>
            <p><strong>取消時間：</strong>${new Date().toLocaleString('zh-TW')}</p>
          </div>
          <a href="${frontendUrl}/meetings" style="background-color: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">查看詳情</a>
        </div>
      `;
    }
    
    const mailOptions = {
      from: `"GBC商務菁英會" <${process.env.SMTP_USER}>`,
      to: to,
      bcc: process.env.SMTP_BCC || process.env.SMTP_USER,
      subject: subject,
      html: html
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`交流通知Email已發送: ${type} to ${to}`);
  } catch (error) {
    console.error('發送交流通知Email失敗:', error);
    
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

// 發送密碼重置郵件
// 發送註冊成功郵件
const sendWelcomeEmail = async ({ email, name }) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.log('郵件服務未配置，無法發送歡迎郵件');
      return;
    }

    const mailOptions = {
      from: `"GBC商務菁英會" <${process.env.SMTP_USER}>`,
      to: email,
      bcc: process.env.SMTP_BCC || process.env.SMTP_USER,
      subject: 'GBC Connect - 歡迎加入！',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin: 0;">GBC Connect</h1>
              <p style="color: #7f8c8d; margin: 5px 0 0 0;">歡迎加入商務菁英會</p>
            </div>
            
            <div style="margin-bottom: 30px;">
              <p style="color: #2c3e50; font-size: 16px; line-height: 1.6;">親愛的 ${name}，</p>
              <p style="color: #2c3e50; font-size: 16px; line-height: 1.6;">歡迎加入 GBC 商務菁英會！您的註冊申請已成功提交。</p>
            </div>
            
            <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2563eb; margin: 0 0 10px 0;">📋 接下來的步驟：</h3>
              <ul style="color: #2c3e50; margin: 0; padding-left: 20px;">
                <li>您的帳號正在等待管理員審核</li>
                <li>審核通過後，您將收到確認郵件</li>
                <li>屆時您就可以使用帳號登入系統</li>
              </ul>
            </div>
            
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0369a1; margin: 0 0 10px 0;">🌟 GBC Connect 功能亮點：</h3>
              <ul style="color: #2c3e50; margin: 0; padding-left: 20px;">
                <li>參與分會活動和會議</li>
                <li>建立商務人脈網絡</li>
                <li>分享和接收商務引薦</li>
                <li>查看會員資訊和聯絡方式</li>
              </ul>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
              <p style="color: #7f8c8d; font-size: 14px; line-height: 1.6;">如果您有任何問題，請隨時聯繫我們的客服團隊。</p>
            </div>
            
            <div style="margin-top: 30px; text-align: center;">
              <p style="color: #7f8c8d; font-size: 12px;">此郵件由 GBC Connect 系統自動發送，請勿回覆。</p>
            </div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`歡迎郵件已發送至: ${email}`);
  } catch (error) {
    console.error('發送歡迎郵件失敗:', error);
    throw error;
  }
};

const sendPasswordResetEmail = async ({ email, name, resetToken }) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('郵件服務未配置，無法發送密碼重置郵件');
    return;
  }

  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: `"GBC商務菁英會" <${process.env.SMTP_USER}>`,
    to: email,
    bcc: process.env.SMTP_BCC || process.env.SMTP_USER,
    subject: 'GBC Connect - 密碼重置請求',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c3e50; margin: 0;">GBC Connect</h1>
            <p style="color: #7f8c8d; margin: 5px 0 0 0;">密碼重置請求</p>
          </div>
          
          <div style="margin-bottom: 30px;">
            <p style="color: #2c3e50; font-size: 16px; line-height: 1.6;">親愛的 ${name}，</p>
            <p style="color: #2c3e50; font-size: 16px; line-height: 1.6;">我們收到了您的密碼重置請求。請點擊下方按鈕來重置您的密碼：</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">重置密碼</a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
            <p style="color: #7f8c8d; font-size: 14px; line-height: 1.6;">如果您無法點擊按鈕，請複製以下連結到瀏覽器中：</p>
            <p style="color: #3498db; font-size: 14px; word-break: break-all;">${resetUrl}</p>
          </div>
          
          <div style="margin-top: 20px;">
            <p style="color: #e74c3c; font-size: 14px; line-height: 1.6;">⚠️ 此連結將在1小時後失效。如果您沒有請求重置密碼，請忽略此郵件。</p>
          </div>
          
          <div style="margin-top: 30px; text-align: center;">
            <p style="color: #7f8c8d; font-size: 12px;">此郵件由 GBC Connect 系統自動發送，請勿回覆。</p>
          </div>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`密碼重置郵件已發送至: ${email}`);
  } catch (error) {
    console.error('發送密碼重置郵件失敗:', error);
    throw error;
  }
};

// 發送審核通過通知郵件
const sendApprovalNotification = async ({ email, name, membershipLevel }) => {
  try {
    const transporter = createTransporter();
    
    // 驗證 SMTP 連接
    await transporter.verify();
    console.log('SMTP server connection verified successfully');
    
    const membershipLevelText = {
      1: '核心會員 (Level 1)',
      2: '一般會員 (Level 2)', 
      3: '準會員 (Level 3)'
    }[membershipLevel] || '會員';
    
    const mailOptions = {
      from: `"GBC商務菁英會" <${process.env.SMTP_USER}>`,
      to: email,
      bcc: process.env.SMTP_BCC || process.env.SMTP_USER,
      subject: 'GBC Connect - 帳號審核通過通知',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1a1a1a;">
          <div style="background: linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%); padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); border: 1px solid #d4af37;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #d4af37; margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">GBC Connect</h1>
              <p style="color: #f5f5dc; margin: 5px 0 0 0; font-size: 14px;">商務菁英會</p>
            </div>
            
            <div style="margin-bottom: 30px;">
              <p style="color: #f5f5dc; font-size: 18px; line-height: 1.6;">親愛的 ${name}，</p>
              <p style="color: #f5f5dc; font-size: 16px; line-height: 1.6;">恭喜您！您的 GBC 商務菁英會帳號已通過審核。</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b8941f 100%); color: #1a1a1a; padding: 20px 40px; border-radius: 10px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">
                ✅ 審核通過
              </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #2c2c2c 0%, #1f1f1f 100%); border: 1px solid #d4af37; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #d4af37; margin: 0 0 15px 0; font-size: 16px;">您的會員資訊：</h3>
              <ul style="color: #f5f5dc; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>會員等級：<strong style="color: #d4af37;">${membershipLevelText}</strong></li>
                <li>帳號狀態：<strong style="color: #00ff00;">已啟用</strong></li>
                <li>現在您可以正常使用系統所有功能</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL || 'https://bci-connect.onrender.com'}/login" 
                 style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b8941f 100%); color: #1a1a1a; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">
                立即登入系統
              </a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #d4af37;">
              <p style="color: #f5f5dc; font-size: 14px; line-height: 1.6;">歡迎加入 GBC 商務菁英會大家庭！如有任何問題，請隨時與我們聯繫。</p>
            </div>
            
            <div style="margin-top: 30px; text-align: center;">
              <p style="color: #888; font-size: 12px;">此郵件由 GBC Connect 系統自動發送，請勿回覆。</p>
            </div>
          </div>
        </div>
      `
    };
    
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Approval notification email sent successfully:', {
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
        messageId: info.messageId
      });
      
      return {
        success: true,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected
      };
    } catch (sendError) {
      console.error('Failed to send approval notification email:', sendError);
      throw sendError;
    }
    
  } catch (error) {
    console.error('Approval notification email service error:', error);
    throw error;
  }
};

// 發送新會員申請待審核通知（給管理員）
const sendNewApplicationNotification = async ({ applicant, approvalUrl }) => {
  try {
    const transporter = createTransporter();
    
    // 驗證 SMTP 連接
    await transporter.verify();
    console.log('SMTP server connection verified successfully for new application');

    const to = process.env.ADMIN_NOTICE_EMAIL || 'gbc.notice@gmail.com';
    const frontendUrl = approvalUrl || (process.env.FRONTEND_URL 
      || (process.env.NODE_ENV === 'production' 
          ? 'https://bci-connect.onrender.com/admin/pending' 
          : 'http://localhost:3001/admin/pending'));

    const safe = (v) => (v === null || v === undefined || v === '' ? '—' : v);
    const created = applicant.createdAt 
      ? new Date(applicant.createdAt).toLocaleString('zh-TW') 
      : new Date().toLocaleString('zh-TW');

    const mailOptions = {
      from: `"GBC商務菁英會" <${process.env.SMTP_USER}>`,
      to,
      bcc: process.env.SMTP_BCC || process.env.SMTP_USER,
      subject: 'GBC Connect - 新會員申請待審核通知',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; background-color: #0b1020;">
          <div style="background: linear-gradient(135deg, #111827 0%, #0b1020 100%); padding: 24px; border-radius: 12px; box-shadow: 0 6px 24px rgba(0,0,0,0.35); border: 1px solid #d4af37;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #d4af37; margin: 0; font-size: 22px;">GBC Connect</h1>
              <p style="color: #f5f5dc; margin: 6px 0 0 0; font-size: 13px;">新會員申請待審核</p>
            </div>

            <div style="background-color: #0f172a; border: 1px solid #1f2937; border-radius: 10px; padding: 16px; margin-top: 10px;">
              <p style="color: #f5f5dc; font-size: 14px; margin: 0 0 12px 0;">系統剛收到一位新會員申請，請儘速進行審核：</p>
              <ul style="list-style: none; padding: 0; margin: 0; color: #e5e7eb; font-size: 14px;">
                <li><strong style="color:#d4af37;">姓名：</strong>${safe(applicant.name)}</li>
                <li><strong style="color:#d4af37;">Email：</strong>${safe(applicant.email)}</li>
                <li><strong style="color:#d4af37;">公司：</strong>${safe(applicant.company)}</li>
                <li><strong style="color:#d4af37;">產業：</strong>${safe(applicant.industry)}</li>
                <li><strong style="color:#d4af37;">職稱：</strong>${safe(applicant.title)}</li>
                <li><strong style="color:#d4af37;">聯絡電話：</strong>${safe(applicant.contactNumber)}</li>
                <li><strong style="color:#d4af37;">申請分會：</strong>${safe(applicant.chapterName || applicant.chapterId)}</li>
                <li><strong style="color:#d4af37;">申請時間：</strong>${created}</li>
                <li><strong style="color:#d4af37;">用戶ID：</strong>${safe(applicant.id)}</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 22px 0 6px 0;">
              <a href="${frontendUrl}" style="display: inline-block; background-color: #d4af37; color: #111827; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; border: 1px solid #f5f5dc;">前往審核</a>
            </div>

            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 10px;">此郵件由系統自動發送到管理員通知信箱（${to}），請勿回覆。</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('New application admin notice email sent:', {
      to,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Send new application admin notice failed:', error);
    throw error;
  }
};

// 教練發送郵件給學員
const sendCoachToMemberEmail = async ({ to, subject, content, type = 'general', coachId, coachName }) => {
  try {
    const transporter = createTransporter();
    
    // 驗證 SMTP 連接
    await transporter.verify();
    console.log('SMTP server connection verified successfully for coach email');
    
    const mailOptions = {
      from: `"GBC商務菁英會" <${process.env.SMTP_USER}>`,
      to: to,
      bcc: process.env.SMTP_BCC || process.env.SMTP_USER,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin: 0;">GBC Connect</h1>
              <p style="color: #7f8c8d; margin: 5px 0 0 0;">來自教練的訊息</p>
            </div>
            
            <div style="margin-bottom: 30px;">
              <p style="color: #2c3e50; font-size: 16px; line-height: 1.6;">親愛的學員，</p>
              <p style="color: #2c3e50; font-size: 16px; line-height: 1.6;">您的教練 <strong>${coachName}</strong> 透過 GBC 系統發送了一則訊息給您：</p>
            </div>
            
            <div style="background-color: #f8f9fa; border-left: 4px solid #3498db; padding: 20px; margin: 20px 0; border-radius: 5px;">
              <div style="color: #2c3e50; font-size: 16px; line-height: 1.8; white-space: pre-line;">
                ${content}
              </div>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
              <p style="color: #7f8c8d; font-size: 14px; line-height: 1.6;">如有任何問題，請直接回覆此郵件或聯繫您的教練。</p>
            </div>
            
            <div style="margin-top: 30px; text-align: center;">
              <p style="color: #7f8c8d; font-size: 12px;">此郵件由 GBC Connect 系統代為發送</p>
              <p style="color: #7f8c8d; font-size: 12px;">教練：${coachName} | 系統信箱：${process.env.SMTP_USER}</p>
            </div>
          </div>
        </div>
      `
    };
    
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Coach email sendMail result:', {
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
        messageId: info.messageId,
        coach: coachName,
        recipient: to,
        type: type
      });

      return {
        success: true,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected
      };

    } catch (sendError) {
      console.error('Coach email send error:', sendError);
      return {
        success: false,
        error: `郵件發送失敗: ${sendError.message}`
      };
    }
    
  } catch (error) {
    console.error('Coach email service error:', error);
    return {
      success: false,
      error: `郵件服務錯誤: ${error.message}`
    };
  }
};

module.exports = {
  generateVerificationCode,
  sendEmailVerification,
  sendAINotification,
  sendReferralNotification,
  sendMeetingNotification,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendApprovalNotification,
  sendCoachToMemberEmail,
  sendNewApplicationNotification
};