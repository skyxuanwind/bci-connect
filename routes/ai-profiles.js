const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { AIProfileService } = require('../services/aiProfileService');
const { AIMatchingService } = require('../services/aiMatchingService');

const aiProfileService = new AIProfileService();
const aiMatchingService = new AIMatchingService();

/**
 * 獲取當前用戶的AI深度畫像
 * GET /api/ai-profiles/me
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await aiProfileService.getCurrentProfile(userId);

    res.json({
      success: true,
      data: {
        userId,
        profile,
        lastUpdated: profile?.lastUpdated || null,
        profileCompleteness: aiProfileService.calculateProfileCompleteness(profile)
      }
    });
  } catch (error) {
    console.error('❌ 獲取AI深度畫像失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '獲取AI深度畫像失敗' 
    });
  }
});

/**
 * 手動觸發AI畫像更新
 * POST /api/ai-profiles/me/update
 */
router.post('/me/update', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { forceUpdate = false } = req.body;

    console.log(`🤖 開始為用戶 ${userId} 更新AI深度畫像...`);

    // 獲取用戶基本資料
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '用戶不存在' 
      });
    }

    const user = userResult.rows[0];

    // 獲取用戶活動數據
    const activitiesResult = await pool.query(`
      SELECT * FROM member_activities 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 100
    `, [userId]);

    // 獲取用戶的會議摘要（如果有授權）
    const meetingsResult = await pool.query(`
      SELECT ma.* FROM meeting_ai_analysis ma
      JOIN meetings m ON ma.meeting_id = m.id
      WHERE (m.requester_id = $1 OR m.attendee_id = $1)
      ORDER BY ma.created_at DESC
      LIMIT 20
    `, [userId]);

    // 構建更新數據
    const updateData = {
      staticData: {
        name: user.name,
        company: user.company,
        industry: user.industry,
        title: user.title,
        interviewForm: user.interview_form,
        // 新增：將會員的 MBTI 與公開設定帶入靜態資料
        mbti: user.mbti || null,
        mbtiPublic: !!user.mbti_public
      },
      behavioralData: {
        activities: activitiesResult.rows,
        lastActivityAt: activitiesResult.rows[0]?.created_at || null
      },
      conversationalData: {
        meetingAnalyses: meetingsResult.rows,
        totalMeetings: meetingsResult.rows.length
      },
      forceUpdate
    };

    console.log('📦 更新資料彙總', {
      activitiesCount: Array.isArray(updateData.behavioralData?.activities) ? updateData.behavioralData.activities.length : 0,
      meetingsCount: updateData.conversationalData?.totalMeetings || 0,
      hasInterviewForm: !!updateData.staticData?.interviewForm,
      interviewFormType: updateData.staticData?.interviewForm ? typeof updateData.staticData.interviewForm : 'none'
    });

    // 執行AI畫像更新
    const updatedProfile = await aiProfileService.updateProfile(userId, updateData);

    // 記錄更新活動
    await pool.query(`
      INSERT INTO member_activities (user_id, activity_type, activity_data)
      VALUES ($1, 'ai_profile_updated', $2)
    `, [userId, JSON.stringify({ 
      updateType: forceUpdate ? 'manual_force' : 'manual',
      profileVersion: updatedProfile.version || 1
    })]);

    res.json({
      success: true,
      message: 'AI深度畫像更新成功',
      data: {
        profile: updatedProfile,
        profileCompleteness: aiProfileService.calculateProfileCompleteness(updatedProfile),
        updateSummary: {
          staticDataUpdated: !!updateData.staticData,
          behavioralDataUpdated: Array.isArray(updateData.behavioralData?.activities) && updateData.behavioralData.activities.length > 0,
          conversationalDataUpdated: (updateData.conversationalData?.totalMeetings || 0) > 0
        }
      }
    });
  } catch (error) {
    console.error('❌ 更新AI深度畫像失敗:', error?.message || error);
    if (error && error.stack) {
      console.error(error.stack);
    }
    res.status(500).json({ 
      success: false, 
      message: '更新AI深度畫像失敗' 
    });
  }
});

/**
 * 獲取畫像分析報告
 * GET /api/ai-profiles/me/analysis
 */
router.get('/me/analysis', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await aiProfileService.getCurrentProfile(userId);

    if (!profile) {
      return res.status(404).json({ 
        success: false, 
        message: 'AI深度畫像不存在，請先更新畫像' 
      });
    }

    // 生成分析報告
    const analysis = {
      profileCompleteness: aiProfileService.calculateProfileCompleteness(profile),
      skillsAnalysis: {
        primarySkills: profile.skills?.primary || [],
        secondarySkills: profile.skills?.secondary || [],
        emergingSkills: profile.skills?.emerging || [],
        skillsCount: (profile.skills?.primary?.length || 0) + (profile.skills?.secondary?.length || 0)
      },
      interestsAnalysis: {
        businessInterests: profile.interests?.business || [],
        industryInterests: profile.interests?.industry || [],
        collaborationTypes: profile.interests?.collaboration || [],
        interestsCount: (profile.interests?.business?.length || 0) + (profile.interests?.industry?.length || 0)
      },
      behaviorAnalysis: {
        activityLevel: profile.behavior?.activityLevel || 'unknown',
        engagementScore: profile.behavior?.engagementScore || 0,
        preferredInteractionTypes: profile.behavior?.preferredInteractionTypes || [],
        networkingStyle: profile.behavior?.networkingStyle || 'unknown'
      },
      collaborationPotential: {
        openToCollaboration: profile.collaboration?.openToCollaboration || false,
        preferredCollaborationTypes: profile.collaboration?.types || [],
        availabilityLevel: profile.collaboration?.availability || 'unknown',
        pastCollaborations: profile.collaboration?.history?.length || 0
      },
      marketPosition: {
        industryExpertise: profile.market?.industryExpertise || 'unknown',
        marketReach: profile.market?.reach || 'local',
        competitiveAdvantages: profile.market?.advantages || [],
        targetMarkets: profile.market?.targets || []
      }
    };

    // 生成改進建議
    const suggestions = [];
    
    if (analysis.profileCompleteness < 70) {
      suggestions.push({
        type: 'profile_completion',
        priority: 'high',
        message: '建議完善您的個人資料和面談表單，以提高AI媒合精準度'
      });
    }

    if (analysis.skillsAnalysis.skillsCount < 5) {
      suggestions.push({
        type: 'skills_enhancement',
        priority: 'medium',
        message: '建議參與更多活動或面談，讓AI更好地識別您的專業技能'
      });
    }

    if (analysis.behaviorAnalysis.engagementScore < 50) {
      suggestions.push({
        type: 'engagement_improvement',
        priority: 'medium',
        message: '建議增加平台互動，如參與活動、發布許願等，以提升媒合機會'
      });
    }

    if (!analysis.collaborationPotential.openToCollaboration) {
      suggestions.push({
        type: 'collaboration_openness',
        priority: 'low',
        message: '考慮開放更多合作可能性，以獲得更多商業機會'
      });
    }

    res.json({
      success: true,
      data: {
        userId,
        analysis,
        suggestions,
        lastAnalyzed: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ 獲取畫像分析失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '獲取畫像分析失敗' 
    });
  }
});

/**
 * 獲取相似會員推薦
 * GET /api/ai-profiles/me/similar-members
 */
router.get('/me/similar-members', authenticateToken, async (req, res) => {
  // 相似會員推薦功能已停用
  return res.status(410).json({
    success: false,
    message: '相似會員推薦功能已停用'
  });
});

/**
 * 獲取畫像歷史版本
 * GET /api/ai-profiles/me/history
 */
router.get('/me/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    // 從活動記錄中獲取畫像更新歷史
    const result = await pool.query(`
      SELECT 
        created_at,
        activity_data
      FROM member_activities 
      WHERE user_id = $1 
      AND activity_type = 'ai_profile_updated'
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, parseInt(limit)]);

    const history = result.rows.map(row => ({
      updatedAt: row.created_at,
      updateDetails: row.activity_data,
      version: row.activity_data?.profileVersion || 1
    }));

    res.json({
      success: true,
      data: {
        history,
        totalUpdates: history.length
      }
    });
  } catch (error) {
    console.error('❌ 獲取畫像歷史失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '獲取畫像歷史失敗' 
    });
  }
});

/**
 * 獲取畫像統計數據
 * GET /api/ai-profiles/stats
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // 獲取平台整體畫像統計（僅管理員可見完整數據）
    const isAdmin = req.user.role === 'admin';
    
    if (!isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: '權限不足' 
      });
    }

    // 獲取有AI畫像的用戶數量
    const profilesResult = await pool.query(`
      SELECT COUNT(*) as total_profiles
      FROM users 
      WHERE ai_deep_profile IS NOT NULL
    `);

    // 獲取最近更新的畫像數量
    const recentUpdatesResult = await pool.query(`
      SELECT COUNT(*) as recent_updates
      FROM member_activities 
      WHERE activity_type = 'ai_profile_updated'
      AND created_at >= CURRENT_DATE - INTERVAL '7 days'
    `);

    // 獲取畫像完整度分布
    const completenessResult = await pool.query(`
      SELECT 
        CASE 
          WHEN ai_deep_profile IS NULL THEN 'no_profile'
          WHEN jsonb_array_length(COALESCE(ai_deep_profile->'skills'->'primary', '[]'::jsonb)) >= 5 
               AND jsonb_array_length(COALESCE(ai_deep_profile->'interests'->'business', '[]'::jsonb)) >= 3
               THEN 'high_completeness'
          WHEN jsonb_array_length(COALESCE(ai_deep_profile->'skills'->'primary', '[]'::jsonb)) >= 2
               THEN 'medium_completeness'
          ELSE 'low_completeness'
        END as completeness_level,
        COUNT(*) as count
      FROM users
      GROUP BY completeness_level
    `);

    const stats = {
      totalProfiles: parseInt(profilesResult.rows[0].total_profiles),
      recentUpdates: parseInt(recentUpdatesResult.rows[0].recent_updates),
      completenessDistribution: {}
    };

    completenessResult.rows.forEach(row => {
      stats.completenessDistribution[row.completeness_level] = parseInt(row.count);
    });

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('❌ 獲取畫像統計失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '獲取畫像統計失敗' 
    });
  }
});

/**
 * 批量更新用戶畫像（管理員功能）
 * POST /api/ai-profiles/batch-update
 */
router.post('/batch-update', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    
    if (!isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: '權限不足' 
      });
    }

    const { userIds, forceUpdate = false } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: '請提供有效的用戶ID列表' 
      });
    }

    console.log(`🤖 開始批量更新 ${userIds.length} 個用戶的AI深度畫像...`);

    const results = {
      success: [],
      failed: [],
      total: userIds.length
    };

    // 異步處理批量更新
    setImmediate(async () => {
      for (const userId of userIds) {
        try {
          // 獲取用戶數據並更新畫像
          const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
          
          if (userResult.rows.length === 0) {
            results.failed.push({ userId, error: '用戶不存在' });
            continue;
          }

          const user = userResult.rows[0];
          
          // 獲取活動數據
          const activitiesResult = await pool.query(`
            SELECT * FROM member_activities 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT 100
          `, [userId]);

          // 獲取會議數據
          const meetingsResult = await pool.query(`
            SELECT ma.* FROM meeting_ai_analysis ma
            JOIN meetings m ON ma.meeting_id = m.id
            WHERE (m.requester_id = $1 OR m.attendee_id = $1)
            ORDER BY ma.created_at DESC
            LIMIT 20
          `, [userId]);

          const updateData = {
            staticData: {
              name: user.name,
              company: user.company,
              industry: user.industry,
              title: user.title,
              interviewForm: user.interview_form
            },
            behavioralData: {
              activities: activitiesResult.rows,
              lastActivityAt: activitiesResult.rows[0]?.created_at || null
            },
            conversationalData: {
              meetingAnalyses: meetingsResult.rows,
              totalMeetings: meetingsResult.rows.length
            },
            forceUpdate
          };

          await aiProfileService.updateProfile(userId, updateData);
          results.success.push({ userId, status: 'updated' });
          
          console.log(`✅ 用戶 ${userId} 的AI畫像更新成功`);
        } catch (error) {
          console.error(`❌ 用戶 ${userId} 的AI畫像更新失敗:`, error);
          results.failed.push({ userId, error: error.message });
        }
      }

      console.log(`🎉 批量更新完成: 成功 ${results.success.length}，失敗 ${results.failed.length}`);
    });

    res.json({
      success: true,
      message: `已開始批量更新 ${userIds.length} 個用戶的AI深度畫像`,
      data: {
        batchId: `batch_${Date.now()}`,
        totalUsers: userIds.length,
        status: 'processing'
      }
    });
  } catch (error) {
    console.error('❌ 批量更新畫像失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '批量更新畫像失敗' 
    });
  }
});

module.exports = router;