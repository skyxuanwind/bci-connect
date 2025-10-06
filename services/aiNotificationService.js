const { pool } = require('../config/database');
const geminiService = require('./geminiService');

class AINotificationService {
  constructor() {
    this.geminiService = geminiService;
  }

  /**
   * 創建AI智慧通知
   * @param {number} userId - 接收通知的用戶ID
   * @param {string} notificationType - 通知類型
   * @param {object} notificationData - 通知數據
   */
  async createNotification(userId, notificationType, notificationData) {
    try {
      const { title, content, relatedUserId, relatedWishId, matchingScore, aiReasoning, priority } = notificationData;
      
      const result = await pool.query(`
        INSERT INTO ai_notifications 
        (user_id, notification_type, title, content, related_user_id, related_wish_id, 
         matching_score, ai_reasoning, priority, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'unread')
        RETURNING id
      `, [
        userId,
        notificationType,
        title,
        content,
        relatedUserId || null,
        relatedWishId || null,
        matchingScore || null,
        aiReasoning || null,
        priority || 1
      ]);
      
      const notificationId = result.rows[0].id;
      console.log(`✅ AI通知已創建 - ID: ${notificationId}, 用戶: ${userId}, 類型: ${notificationType}`);
      
      return notificationId;
    } catch (error) {
      console.error('❌ 創建AI通知失敗:', error);
      throw error;
    }
  }

  /**
   * 協同效應推薦通知
   * @param {number} userId - 接收通知的用戶ID
   * @param {number} relatedUserId - 相關用戶ID
   * @param {object} collaborationData - 合作數據
   */
  async sendCollaborationRecommendation(userId, relatedUserId, collaborationData) {
    try {
      // 獲取相關用戶資訊
      const relatedUserResult = await pool.query(
        'SELECT name, company, industry, title FROM users WHERE id = $1',
        [relatedUserId]
      );
      
      if (relatedUserResult.rows.length === 0) {
        throw new Error(`相關用戶不存在: ${relatedUserId}`);
      }
      
      const relatedUser = relatedUserResult.rows[0];
      
      // 生成個性化通知內容
      const notificationContent = await this.generateCollaborationNotification(
        relatedUser,
        collaborationData
      );
      
      const notificationData = {
        title: '🤝 AI發現新的合作機會！',
        content: notificationContent.content,
        relatedUserId: relatedUserId,
        matchingScore: collaborationData.matchingScore,
        aiReasoning: notificationContent.reasoning,
        priority: collaborationData.matchingScore >= 90 ? 3 : collaborationData.matchingScore >= 80 ? 2 : 1
      };
      
      return await this.createNotification(userId, 'collaboration_opportunity', notificationData);
    } catch (error) {
      console.error('❌ 發送協同效應推薦失敗:', error);
      throw error;
    }
  }


  /**
   * 會議洞察通知
   * @param {number} userId - 接收通知的用戶ID
   * @param {object} meetingInsights - 會議洞察數據
   */
  async sendMeetingInsightsNotification(userId, meetingInsights) {
    try {
      const notificationContent = await this.generateMeetingInsightsNotification(meetingInsights);
      
      const notificationData = {
        title: '💡 會議智慧洞察',
        content: notificationContent.content,
        aiReasoning: notificationContent.reasoning,
        priority: 2
      };
      
      return await this.createNotification(userId, 'meeting_insights', notificationData);
    } catch (error) {
      console.error('❌ 發送會議洞察通知失敗:', error);
      throw error;
    }
  }

  /**
   * 市場機會通知
   * @param {number} userId - 接收通知的用戶ID
   * @param {object} marketOpportunity - 市場機會數據
   */
  async sendMarketOpportunityNotification(userId, marketOpportunity) {
    try {
      const notificationContent = await this.generateMarketOpportunityNotification(marketOpportunity);
      
      const notificationData = {
        title: '📈 市場趨勢機會',
        content: notificationContent.content,
        aiReasoning: notificationContent.reasoning,
        priority: 2
      };
      
      return await this.createNotification(userId, 'market_opportunity', notificationData);
    } catch (error) {
      console.error('❌ 發送市場機會通知失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取用戶的AI通知
   * @param {number} userId - 用戶ID
   * @param {string} status - 通知狀態 ('unread', 'read', 'all')
   * @param {number} limit - 限制數量
   */
  async getUserNotifications(userId, status = 'all', limit = 20) {
    try {
      let query = `
        SELECT 
          an.*,
          ru.name as related_user_name,
          ru.company as related_user_company,
          mw.title as wish_title
        FROM ai_notifications an
        LEFT JOIN users ru ON an.related_user_id = ru.id
        LEFT JOIN member_wishes mw ON an.related_wish_id = mw.id
        WHERE an.user_id = $1
      `;
      
      const params = [userId];
      
      if (status !== 'all') {
        query += ' AND an.status = $2';
        params.push(status);
      }
      
      query += ' ORDER BY an.created_at DESC LIMIT $' + (params.length + 1);
      params.push(limit);
      
      const result = await pool.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        type: row.notification_type,
        title: row.title,
        content: row.content,
        status: row.status,
        priority: row.priority,
        matchingScore: row.matching_score ? parseFloat(row.matching_score) : null,
        aiReasoning: row.ai_reasoning,
        relatedUser: row.related_user_id ? {
          id: row.related_user_id,
          name: row.related_user_name,
          company: row.related_user_company
        } : null,
        relatedWish: row.related_wish_id ? {
          id: row.related_wish_id,
          title: row.wish_title
        } : null,
        createdAt: row.created_at,
        readAt: row.read_at
      }));
    } catch (error) {
      console.error('❌ 獲取用戶通知失敗:', error);
      throw error;
    }
  }

  /**
   * 標記通知為已讀
   * @param {number} notificationId - 通知ID
   * @param {number} userId - 用戶ID（用於驗證）
   */
  async markNotificationAsRead(notificationId, userId) {
    try {
      const result = await pool.query(`
        UPDATE ai_notifications 
        SET status = 'read', read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `, [notificationId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('通知不存在或無權限');
      }
      
      console.log(`✅ 通知已標記為已讀 - ID: ${notificationId}`);
      return true;
    } catch (error) {
      console.error('❌ 標記通知為已讀失敗:', error);
      throw error;
    }
  }

  /**
   * 批量標記通知為已讀
   * @param {number[]} notificationIds - 通知ID陣列
   * @param {number} userId - 用戶ID
   */
  async markMultipleNotificationsAsRead(notificationIds, userId) {
    try {
      const result = await pool.query(`
        UPDATE ai_notifications 
        SET status = 'read', read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY($1) AND user_id = $2
        RETURNING id
      `, [notificationIds, userId]);
      
      console.log(`✅ ${result.rows.length} 個通知已標記為已讀`);
      return result.rows.length;
    } catch (error) {
      console.error('❌ 批量標記通知為已讀失敗:', error);
      throw error;
    }
  }

  /**
   * 刪除通知
   * @param {number} notificationId - 通知ID
   * @param {number} userId - 用戶ID
   */
  async deleteNotification(notificationId, userId) {
    try {
      const result = await pool.query(`
        UPDATE ai_notifications 
        SET status = 'dismissed', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `, [notificationId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('通知不存在或無權限');
      }
      
      console.log(`✅ 通知已刪除 - ID: ${notificationId}`);
      return true;
    } catch (error) {
      console.error('❌ 刪除通知失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取未讀通知數量
   * @param {number} userId - 用戶ID
   */
  async getUnreadNotificationCount(userId) {
    try {
      const result = await pool.query(
        'SELECT COUNT(*) as count FROM ai_notifications WHERE user_id = $1 AND status = \'unread\'',
        [userId]
      );
      
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('❌ 獲取未讀通知數量失敗:', error);
      throw error;
    }
  }


  /**
   * 生成協同效應通知內容
   */
  async generateCollaborationNotification(relatedUser, collaborationData) {
    try {
      const prompt = `
請為以下商業合作機會生成一個吸引人且專業的通知內容：

合作對象：
- 姓名：${relatedUser.name}
- 公司：${relatedUser.company}
- 產業：${relatedUser.industry}
- 職稱：${relatedUser.title}

合作數據：
- 匹配分數：${collaborationData.matchingScore}分
- 合作基礎：${collaborationData.basis || '商業互補性'}
- 潛在價值：${collaborationData.potential || '高度協同效應'}

請生成：
1. 一個80字以內的通知內容，要有吸引力且具體
2. 一個簡短的AI推薦理由

格式：
{
  "content": "通知內容",
  "reasoning": "推薦理由"
}
      `;
      
      const aiResponse = await this.geminiService.generateContent(prompt);
      return this.parseNotificationContent(aiResponse);
    } catch (error) {
      console.error('❌ 生成協同效應通知內容失敗:', error);
      return {
        content: `AI合作網絡發現新機會！根據您的商業畫像，${relatedUser.name}（${relatedUser.company}）與您有高度合作潛力。系統評估匹配度達${collaborationData.matchingScore}分，建議您立即發起商務面談。`,
        reasoning: `基於商業互補性和協同效應分析，該會員與您的合作潛力評分為${collaborationData.matchingScore}分。`
      };
    }
  }


  /**
   * 生成交流洞察通知內容
   */
  async generateMeetingInsightsNotification(meetingInsights) {
    try {
      const prompt = `
請為以下交流洞察生成一個有價值的通知內容：

交流洞察：
${JSON.stringify(meetingInsights, null, 2)}

請生成：
1. 一個80字以內的通知內容，突出關鍵洞察
2. 一個簡短的AI分析理由

格式：
{
  "content": "通知內容",
  "reasoning": "分析理由"
}
      `;
      
      const aiResponse = await this.geminiService.generateContent(prompt);
      return this.parseNotificationContent(aiResponse);
    } catch (error) {
      console.error('❌ 生成交流洞察通知內容失敗:', error);
      return {
        content: '您的最近交流中發現了重要的商業洞察和合作機會，AI已為您整理了關鍵要點和後續建議。',
        reasoning: '基於交流內容的語意分析，識別出潛在的商業價值和合作機會。'
      };
    }
  }

  /**
   * 生成市場機會通知內容
   */
  async generateMarketOpportunityNotification(marketOpportunity) {
    try {
      const prompt = `
請為以下市場機會生成一個有吸引力的通知內容：

市場機會：
${JSON.stringify(marketOpportunity, null, 2)}

請生成：
1. 一個80字以內的通知內容，突出機會價值
2. 一個簡短的AI分析理由

格式：
{
  "content": "通知內容",
  "reasoning": "分析理由"
}
      `;
      
      const aiResponse = await this.geminiService.generateContent(prompt);
      return this.parseNotificationContent(aiResponse);
    } catch (error) {
      console.error('❌ 生成市場機會通知內容失敗:', error);
      return {
        content: 'AI市場分析發現了與您業務相關的新趨勢和機會，建議您關注相關發展並考慮策略調整。',
        reasoning: '基於市場趨勢分析和您的商業畫像，識別出潛在的市場機會。'
      };
    }
  }

  /**
   * 解析通知內容
   */
  parseNotificationContent(aiResponse) {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return {
        content: aiResponse.trim(),
        reasoning: 'AI智慧分析結果'
      };
    } catch (error) {
      console.error('❌ 解析通知內容失敗:', error);
      return {
        content: aiResponse.trim(),
        reasoning: 'AI智慧分析結果'
      };
    }
  }
}

module.exports = { AINotificationService };