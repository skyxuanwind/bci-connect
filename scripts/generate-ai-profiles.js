const { pool } = require('../config/database');
const { AIProfileService } = require('../services/aiProfileService');

const aiProfileService = new AIProfileService();

/**
 * 為所有測試用戶生成AI深度畫像
 */
const generateAIProfiles = async () => {
  try {
    console.log('🤖 開始為測試用戶生成AI深度畫像...');
    
    // 獲取所有沒有AI深度畫像的活躍用戶
    const usersResult = await pool.query(`
      SELECT id, name, email, company, industry, title, interview_form
      FROM users 
      WHERE status = 'active' AND (ai_deep_profile IS NULL OR ai_deep_profile = '{}')
      ORDER BY id
    `);
    
    const users = usersResult.rows;
    console.log(`📊 找到 ${users.length} 個需要生成AI畫像的用戶`);
    
    for (const user of users) {
      try {
        console.log(`\n🔄 正在為 ${user.name} (${user.email}) 生成AI畫像...`);
        
        // 構建更新數據
        const updateData = {
          staticData: {
            name: user.name,
            company: user.company,
            industry: user.industry,
            title: user.title,
            interviewForm: user.interview_form
          },
          behavioralData: {
            activities: [], // 新用戶沒有活動記錄
            lastActivityAt: null
          },
          conversationalData: {
            meetingAnalyses: [], // 新用戶沒有會議記錄
            totalMeetings: 0
          },
          forceUpdate: true // 強制更新
        };
        
        // 生成AI深度畫像 - 使用靜態數據更新
        const profile = await aiProfileService.updateMemberProfile(user.id, 'static', updateData.staticData);
        
        console.log(`✅ ${user.name} 的AI畫像生成成功`);
        
        // 記錄活動
        await pool.query(`
          INSERT INTO member_activities (user_id, activity_type, activity_data)
          VALUES ($1, 'ai_profile_generated', $2)
        `, [user.id, JSON.stringify({ 
          generationType: 'initial_setup',
          profileVersion: profile.version || 1
        })]);
        
      } catch (error) {
        console.error(`❌ 為 ${user.name} 生成AI畫像失敗:`, error.message);
      }
    }
    
    console.log('\n🎉 AI深度畫像生成完成！');
    
    // 驗證結果
    const verifyResult = await pool.query(`
      SELECT COUNT(*) as total_users,
             COUNT(ai_deep_profile) as users_with_profile
      FROM users 
      WHERE status = 'active'
    `);
    
    const stats = verifyResult.rows[0];
    console.log(`\n📈 統計結果:`);
    console.log(`• 總活躍用戶: ${stats.total_users}`);
    console.log(`• 已有AI畫像: ${stats.users_with_profile}`);
    console.log(`• 完成率: ${((stats.users_with_profile / stats.total_users) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ 生成AI深度畫像時發生錯誤:', error);
  } finally {
    await pool.end();
  }
};

// 如果直接執行此腳本
if (require.main === module) {
  generateAIProfiles();
}

module.exports = { generateAIProfiles };