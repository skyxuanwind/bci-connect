const nodemailer = require('nodemailer');

// 創建郵件傳輸器
const createTransporter = () => {
  // 檢查必要的環境變數
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('Email configuration missing: SMTP_USER and SMTP_PASS are required');
  }
  
  return nodemailer.createTransporter({
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
      from: `"GBC商務菁英會" <gbc.notice@gmail.com>`,
      to: email,
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
    
    await transporter.sendMail(mailOptions);
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
      from: `"GBC商務菁英會" <gbc.notice@gmail.com>`,
      to: toEmail,
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
      from: `"GBC商務菁英會" <gbc.notice@gmail.com>`,
      to: attendeeEmail,
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
      from: process.env.SMTP_USER,
      to: email,
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
    from: process.env.SMTP_USER,
    to: email,
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

module.exports = {
  generateVerificationCode,
  sendEmailVerification,
  sendAINotification,
  sendReferralNotification,
  sendMeetingNotification,
  sendPasswordResetEmail,
  sendWelcomeEmail
};