const { pool } = require('../config/database');
const geminiService = require('./geminiService');

class AIProfileService {
  constructor() {
    this.geminiService = geminiService;
  }

  /**
   * 更新會員的AI深度畫像
   * @param {number} userId - 會員ID
   * @param {string} dataSource - 數據來源 ('static', 'behavioral', 'conversational')
   * @param {object} newData - 新的數據
   */
  async updateMemberProfile(userId, dataSource, newData) {
    try {
      // 獲取現有的AI深度畫像
      const currentProfile = await this.getCurrentProfile(userId);
      
      // 根據數據來源更新相應部分
      const updatedProfile = await this.mergeProfileData(currentProfile, dataSource, newData);
      
      // 使用AI分析和結構化數據
      const analyzedProfile = await this.analyzeWithAI(updatedProfile, dataSource, newData);
      
      // 更新資料庫
      await pool.query(
        'UPDATE users SET ai_deep_profile = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [JSON.stringify(analyzedProfile), userId]
      );
      
      console.log(`✅ AI深度畫像已更新 - 會員ID: ${userId}, 數據來源: ${dataSource}`);
      return analyzedProfile;
    } catch (error) {
      console.error('❌ 更新AI深度畫像失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取會員當前的AI深度畫像
   */
  async getCurrentProfile(userId) {
    try {
      const result = await pool.query(
        'SELECT ai_deep_profile FROM users WHERE id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        throw new Error(`會員不存在: ${userId}`);
      }
      
      return result.rows[0].ai_deep_profile || this.getDefaultProfile();
    } catch (error) {
      console.error('❌ 獲取AI深度畫像失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取預設的畫像結構
   */
  getDefaultProfile() {
    return {
      static_data: {
        skills: [],
        industries: [],
        expertise_areas: [],
        company_info: {},
        professional_background: {}
      },
      behavioral_data: {
        activity_patterns: {},
        interaction_preferences: {},
        search_history: [],
        event_participation: [],
        network_connections: []
      },
      conversational_data: {
        business_intents: [],
        pain_points: [],
        collaboration_interests: [],
        future_plans: [],
        communication_style: {}
      },
      ai_insights: {
        personality_traits: [],
        business_compatibility: {},
        collaboration_potential: {},
        market_opportunities: [],
        risk_factors: []
      },
      last_updated: new Date().toISOString(),
      data_sources: {
        static: { last_update: null, confidence: 0 },
        behavioral: { last_update: null, confidence: 0 },
        conversational: { last_update: null, confidence: 0 }
      }
    };
  }

  /**
   * 合併新數據到現有畫像
   */
  async mergeProfileData(currentProfile, dataSource, newData) {
    const profile = { ...currentProfile };
    const timestamp = new Date().toISOString();
    
    switch (dataSource) {
      case 'static':
        profile.static_data = { ...profile.static_data, ...newData };
        profile.data_sources.static.last_update = timestamp;
        break;
        
      case 'behavioral':
        profile.behavioral_data = this.mergeBehavioralData(profile.behavioral_data, newData);
        profile.data_sources.behavioral.last_update = timestamp;
        break;
        
      case 'conversational':
        profile.conversational_data = this.mergeConversationalData(profile.conversational_data, newData);
        profile.data_sources.conversational.last_update = timestamp;
        break;
    }
    
    profile.last_updated = timestamp;
    return profile;
  }

  /**
   * 合併行為數據
   */
  mergeBehavioralData(current, newData) {
    return {
      activity_patterns: { ...current.activity_patterns, ...newData.activity_patterns },
      interaction_preferences: { ...current.interaction_preferences, ...newData.interaction_preferences },
      search_history: [...(current.search_history || []), ...(newData.search_history || [])].slice(-100), // 保留最近100筆
      event_participation: [...(current.event_participation || []), ...(newData.event_participation || [])],
      network_connections: [...(current.network_connections || []), ...(newData.network_connections || [])]
    };
  }

  /**
   * 合併對話數據
   */
  mergeConversationalData(current, newData) {
    return {
      business_intents: [...(current.business_intents || []), ...(newData.business_intents || [])],
      pain_points: [...(current.pain_points || []), ...(newData.pain_points || [])],
      collaboration_interests: [...(current.collaboration_interests || []), ...(newData.collaboration_interests || [])],
      future_plans: [...(current.future_plans || []), ...(newData.future_plans || [])],
      communication_style: { ...current.communication_style, ...newData.communication_style }
    };
  }

  /**
   * 使用AI分析和增強畫像數據
   */
  async analyzeWithAI(profile, dataSource, newData) {
    try {
      const analysisPrompt = this.buildAnalysisPrompt(profile, dataSource, newData);
      const aiAnalysis = await this.geminiService.generateContent(analysisPrompt);
      
      // 解析AI分析結果
      const insights = this.parseAIAnalysis(aiAnalysis);
      
      // 更新AI洞察
      profile.ai_insights = {
        ...profile.ai_insights,
        ...insights,
        last_analysis: new Date().toISOString()
      };
      
      // 更新信心度
      this.updateConfidenceScores(profile, dataSource);
      
      return profile;
    } catch (error) {
      console.error('❌ AI分析失敗:', error);
      // 如果AI分析失敗，仍返回更新的基本畫像
      return profile;
    }
  }

  /**
   * 構建AI分析提示
   */
  buildAnalysisPrompt(profile, dataSource, newData) {
    return `
作為一個專業的商業分析AI，請分析以下會員資料並提供深度洞察：

當前會員畫像：
${JSON.stringify(profile, null, 2)}

新增數據來源：${dataSource}
新增數據：
${JSON.stringify(newData, null, 2)}

請提供以下分析（以JSON格式回應）：
1. personality_traits: 個性特質分析（陣列）
2. business_compatibility: 商業相容性評估（物件，包含各產業的相容度分數0-100）
3. collaboration_potential: 合作潛力分析（物件，包含合作類型和潛力分數）
4. market_opportunities: 市場機會識別（陣列）
5. risk_factors: 風險因素評估（陣列）

請確保分析結果實用、準確且有助於商業媒合。
    `;
  }

  /**
   * 解析AI分析結果
   */
  parseAIAnalysis(aiResponse) {
    try {
      // 嘗試從回應中提取JSON
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // 如果無法解析，返回預設結構
      return {
        personality_traits: [],
        business_compatibility: {},
        collaboration_potential: {},
        market_opportunities: [],
        risk_factors: []
      };
    } catch (error) {
      console.error('❌ 解析AI分析結果失敗:', error);
      return {
        personality_traits: [],
        business_compatibility: {},
        collaboration_potential: {},
        market_opportunities: [],
        risk_factors: []
      };
    }
  }

  /**
   * 更新信心度分數
   */
  updateConfidenceScores(profile, dataSource) {
    const baseScore = profile.data_sources[dataSource].confidence || 0;
    const increment = dataSource === 'conversational' ? 15 : dataSource === 'behavioral' ? 10 : 5;
    
    profile.data_sources[dataSource].confidence = Math.min(100, baseScore + increment);
  }

  /**
   * 處理靜態資料更新（個人檔案變更時調用）
   */
  async handleStaticDataUpdate(userId, userData) {
    const staticData = {
      company_info: {
        name: userData.company,
        industry: userData.industry,
        title: userData.title
      },
      professional_background: {
        industry: userData.industry,
        title: userData.title,
        experience_level: this.inferExperienceLevel(userData.title)
      }
    };
    
    // 如果有面試表單數據，也包含進來
    if (userData.interview_form) {
      staticData.skills = this.extractSkillsFromInterview(userData.interview_form);
      staticData.industries = this.extractIndustriesFromInterview(userData.interview_form);
      staticData.expertise_areas = this.extractExpertiseFromInterview(userData.interview_form);
    }
    
    return await this.updateMemberProfile(userId, 'static', staticData);
  }

  /**
   * 處理行為資料更新（用戶活動時調用）
   */
  async handleBehavioralDataUpdate(userId, activityData) {
    const behavioralData = {
      activity_patterns: {
        [activityData.type]: (activityData.timestamp || new Date().toISOString())
      },
      search_history: activityData.search_terms ? [{
        terms: activityData.search_terms,
        timestamp: new Date().toISOString()
      }] : [],
      event_participation: activityData.event_id ? [{
        event_id: activityData.event_id,
        action: activityData.action,
        timestamp: new Date().toISOString()
      }] : [],
      network_connections: activityData.connected_user_id ? [{
        user_id: activityData.connected_user_id,
        connection_type: activityData.connection_type,
        timestamp: new Date().toISOString()
      }] : []
    };
    
    return await this.updateMemberProfile(userId, 'behavioral', behavioralData);
  }

  /**
   * 處理對話資料更新（會議摘要分析後調用）
   */
  async handleConversationalDataUpdate(userId, conversationData) {
    const conversationalData = {
      business_intents: conversationData.business_intents || [],
      pain_points: conversationData.pain_points || [],
      collaboration_interests: conversationData.collaboration_interests || [],
      future_plans: conversationData.future_plans || [],
      communication_style: conversationData.communication_style || {}
    };
    
    return await this.updateMemberProfile(userId, 'conversational', conversationalData);
  }

  /**
   * 輔助方法：從職稱推斷經驗等級
   */
  inferExperienceLevel(title) {
    if (!title) return 'unknown';
    
    const titleLower = title.toLowerCase();
    if (titleLower.includes('ceo') || titleLower.includes('總經理') || titleLower.includes('董事')) {
      return 'executive';
    } else if (titleLower.includes('經理') || titleLower.includes('主管') || titleLower.includes('director')) {
      return 'senior';
    } else if (titleLower.includes('專員') || titleLower.includes('specialist')) {
      return 'mid';
    } else {
      return 'junior';
    }
  }

  /**
   * 輔助方法：從面試表單提取技能
   */
  extractSkillsFromInterview(interviewForm) {
    const skills = [];
    
    if (interviewForm.expertise_areas) {
      skills.push(...interviewForm.expertise_areas.split(',').map(s => s.trim()));
    }
    
    if (interviewForm.coreServices) {
      skills.push(...interviewForm.coreServices.split(',').map(s => s.trim()));
    }
    
    return [...new Set(skills)]; // 去重
  }

  /**
   * 輔助方法：從面試表單提取產業
   */
  extractIndustriesFromInterview(interviewForm) {
    const industries = [];
    
    if (interviewForm.industry) {
      industries.push(interviewForm.industry);
    }
    
    if (interviewForm.targetMarket) {
      industries.push(...interviewForm.targetMarket.split(',').map(s => s.trim()));
    }
    
    return [...new Set(industries)];
  }

  /**
   * 輔助方法：從面試表單提取專業領域
   */
  extractExpertiseFromInterview(interviewForm) {
    const expertise = [];
    
    if (interviewForm.competitiveAdvantage) {
      expertise.push(interviewForm.competitiveAdvantage);
    }
    
    if (interviewForm.coreServices) {
      expertise.push(interviewForm.coreServices);
    }
    
    return expertise;
  }

  /**
   * 計算畫像完整度
   */
  calculateProfileCompleteness(profile) {
    if (!profile) {
      return 0;
    }

    let totalScore = 0;
    let maxScore = 100;

    // 靜態資料完整度 (40%)
    const staticData = profile.static_data || {};
    let staticScore = 0;
    
    if (staticData.skills && staticData.skills.length > 0) staticScore += 10;
    if (staticData.industries && staticData.industries.length > 0) staticScore += 10;
    if (staticData.expertise_areas && staticData.expertise_areas.length > 0) staticScore += 10;
    if (staticData.company_info && Object.keys(staticData.company_info).length > 0) staticScore += 10;
    
    totalScore += staticScore;

    // 行為資料完整度 (30%)
    const behavioralData = profile.behavioral_data || {};
    let behavioralScore = 0;
    
    if (behavioralData.activity_patterns && Object.keys(behavioralData.activity_patterns).length > 0) behavioralScore += 10;
    if (behavioralData.event_participation && behavioralData.event_participation.length > 0) behavioralScore += 10;
    if (behavioralData.network_connections && behavioralData.network_connections.length > 0) behavioralScore += 10;
    
    totalScore += behavioralScore;

    // 對話資料完整度 (30%)
    const conversationalData = profile.conversational_data || {};
    let conversationalScore = 0;
    
    if (conversationalData.business_intents && conversationalData.business_intents.length > 0) conversationalScore += 10;
    if (conversationalData.pain_points && conversationalData.pain_points.length > 0) conversationalScore += 10;
    if (conversationalData.collaboration_interests && conversationalData.collaboration_interests.length > 0) conversationalScore += 10;
    
    totalScore += conversationalScore;

    return Math.min(100, totalScore);
  }
}

module.exports = { AIProfileService };