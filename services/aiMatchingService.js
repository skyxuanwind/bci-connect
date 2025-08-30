const { pool } = require('../config/database');
const geminiService = require('./geminiService');
const { AIProfileService } = require('./aiProfileService');

class AIMatchingService {
  constructor() {
    this.geminiService = geminiService;
    this.aiProfileService = new AIProfileService();
  }

  /**
   * 分析許願內容並提取關鍵意圖
   * @param {string} wishDescription - 許願描述
   * @param {string} wishTitle - 許願標題
   * @param {string} category - 許願分類
   */
  async analyzeWishContent(wishDescription, wishTitle, category) {
    try {
      const analysisPrompt = `
作為一個專業的商業需求分析AI，請分析以下商業需求並提取關鍵資訊：

標題：${wishTitle}
分類：${category}
描述：${wishDescription}

請以JSON格式提供以下分析結果：
{
  "primary_intent": "主要商業意圖",
  "secondary_intents": ["次要意圖1", "次要意圖2"],
  "required_skills": ["需要的技能1", "技能2"],
  "target_industries": ["目標產業1", "產業2"],
  "collaboration_type": "合作類型（partnership/service/investment/networking）",
  "urgency_level": "緊急程度（high/medium/low）",
  "keywords": ["關鍵字1", "關鍵字2"],
  "target_audience": {
    "company_size": "目標公司規模",
    "experience_level": "目標經驗等級",
    "specific_roles": ["特定職位"]
  },
  "success_criteria": ["成功標準1", "標準2"]
}
      `;
      
      const aiResponse = await this.geminiService.generateContent(analysisPrompt);
      return this.parseIntentAnalysis(aiResponse);
    } catch (error) {
      console.error('❌ 分析許願內容失敗:', error);
      return this.getDefaultIntentAnalysis();
    }
  }

  /**
   * 為許願尋找匹配的會員
   * @param {number} wishId - 許願ID
   * @param {object} extractedIntents - 提取的意圖
   * @param {number} limit - 返回結果數量限制
   */
  async findMatchingMembers(wishId, extractedIntents, limit = 10) {
    try {
      // 獲取所有活躍會員的AI深度畫像
      const membersResult = await pool.query(`
        SELECT id, name, email, company, industry, title, ai_deep_profile, interview_form
        FROM users 
        WHERE status = 'active' AND ai_deep_profile IS NOT NULL
      `);
      
      const members = membersResult.rows;
      const matchingResults = [];
      
      for (const member of members) {
        const matchingScore = await this.calculateMatchingScore(member, extractedIntents);
        
        if (matchingScore.score >= 60) { // 只保留60分以上的匹配
          matchingResults.push({
            member,
            score: matchingScore.score,
            reasons: matchingScore.reasons,
            explanation: matchingScore.explanation
          });
        }
      }
      
      // 按分數排序並限制數量
      matchingResults.sort((a, b) => b.score - a.score);
      const topMatches = matchingResults.slice(0, limit);
      
      // 儲存匹配結果到資料庫
      await this.saveMatchingResults(wishId, topMatches);
      
      return topMatches;
    } catch (error) {
      console.error('❌ 尋找匹配會員失敗:', error);
      throw error;
    }
  }

  /**
   * 計算會員與許願的匹配分數
   */
  async calculateMatchingScore(member, extractedIntents) {
    try {
      const profile = member.ai_deep_profile;
      const interviewForm = member.interview_form;
      
      let totalScore = 0;
      const reasons = [];
      const maxScore = 100;
      
      // 1. 技能匹配 (30分)
      const skillScore = this.calculateSkillMatch(profile, extractedIntents, reasons);
      totalScore += skillScore;
      
      // 2. 產業匹配 (25分)
      const industryScore = this.calculateIndustryMatch(member, profile, extractedIntents, reasons);
      totalScore += industryScore;
      
      // 3. 合作類型匹配 (20分)
      const collaborationScore = this.calculateCollaborationMatch(profile, extractedIntents, reasons);
      totalScore += collaborationScore;
      
      // 4. 經驗等級匹配 (15分)
      const experienceScore = this.calculateExperienceMatch(member, extractedIntents, reasons);
      totalScore += experienceScore;
      
      // 5. 行為模式匹配 (10分)
      const behaviorScore = this.calculateBehaviorMatch(profile, extractedIntents, reasons);
      totalScore += behaviorScore;
      
      // 使用AI生成個性化解釋
      const explanation = await this.generateMatchingExplanation(member, extractedIntents, totalScore, reasons);
      
      return {
        score: Math.min(totalScore, maxScore),
        reasons,
        explanation
      };
    } catch (error) {
      console.error('❌ 計算匹配分數失敗:', error);
      return { score: 0, reasons: [], explanation: '計算匹配分數時發生錯誤' };
    }
  }

  /**
   * 計算技能匹配分數
   */
  calculateSkillMatch(profile, extractedIntents, reasons) {
    const requiredSkills = extractedIntents.required_skills || [];
    const memberSkills = profile.static_data?.skills || [];
    
    if (requiredSkills.length === 0) return 15; // 如果沒有特定技能要求，給予基礎分數
    
    let matchCount = 0;
    const matchedSkills = [];
    
    for (const requiredSkill of requiredSkills) {
      for (const memberSkill of memberSkills) {
        if (this.isSkillMatch(requiredSkill, memberSkill)) {
          matchCount++;
          matchedSkills.push(memberSkill);
          break;
        }
      }
    }
    
    const skillScore = Math.round((matchCount / requiredSkills.length) * 30);
    
    if (matchedSkills.length > 0) {
      reasons.push(`具備相關技能：${matchedSkills.join('、')}`);
    }
    
    return skillScore;
  }

  /**
   * 計算產業匹配分數
   */
  calculateIndustryMatch(member, profile, extractedIntents, reasons) {
    const targetIndustries = extractedIntents.target_industries || [];
    const memberIndustry = member.industry;
    const profileIndustries = profile.static_data?.industries || [];
    
    if (targetIndustries.length === 0) return 12; // 基礎分數
    
    let bestMatch = 0;
    let matchedIndustry = '';
    
    // 檢查主要產業
    for (const targetIndustry of targetIndustries) {
      if (this.isIndustryMatch(targetIndustry, memberIndustry)) {
        bestMatch = Math.max(bestMatch, 25);
        matchedIndustry = memberIndustry;
      }
    }
    
    // 檢查畫像中的產業
    for (const targetIndustry of targetIndustries) {
      for (const profileIndustry of profileIndustries) {
        if (this.isIndustryMatch(targetIndustry, profileIndustry)) {
          bestMatch = Math.max(bestMatch, 20);
          matchedIndustry = profileIndustry;
        }
      }
    }
    
    if (bestMatch > 0 && matchedIndustry) {
      reasons.push(`產業相關：${matchedIndustry}`);
    }
    
    return bestMatch;
  }

  /**
   * 計算合作類型匹配分數
   */
  calculateCollaborationMatch(profile, extractedIntents, reasons) {
    const collaborationType = extractedIntents.collaboration_type;
    const collaborationPotential = profile.ai_insights?.collaboration_potential || {};
    
    if (!collaborationType) return 10; // 基礎分數
    
    const potentialScore = collaborationPotential[collaborationType] || 0;
    const score = Math.round((potentialScore / 100) * 20);
    
    if (score > 10) {
      reasons.push(`適合${collaborationType}類型合作`);
    }
    
    return score;
  }

  /**
   * 計算經驗等級匹配分數
   */
  calculateExperienceMatch(member, extractedIntents, reasons) {
    const targetAudience = extractedIntents.target_audience || {};
    const targetRoles = targetAudience.specific_roles || [];
    const targetExperience = targetAudience.experience_level;
    
    const memberTitle = member.title || '';
    const memberExperience = this.aiProfileService.inferExperienceLevel(memberTitle);
    
    let score = 7; // 基礎分數
    
    // 檢查職位匹配
    for (const targetRole of targetRoles) {
      if (this.isRoleMatch(targetRole, memberTitle)) {
        score += 5;
        reasons.push(`職位相符：${memberTitle}`);
        break;
      }
    }
    
    // 檢查經驗等級匹配
    if (targetExperience && this.isExperienceMatch(targetExperience, memberExperience)) {
      score += 3;
      reasons.push(`經驗等級適合：${memberExperience}`);
    }
    
    return Math.min(score, 15);
  }

  /**
   * 計算行為模式匹配分數
   */
  calculateBehaviorMatch(profile, extractedIntents, reasons) {
    const behavioralData = profile.behavioral_data || {};
    const activityPatterns = behavioralData.activity_patterns || {};
    
    let score = 5; // 基礎分數
    
    // 檢查活躍度
    const recentActivity = Object.keys(activityPatterns).length;
    if (recentActivity > 5) {
      score += 3;
      reasons.push('平台活躍用戶');
    }
    
    // 檢查網絡連接
    const networkConnections = behavioralData.network_connections || [];
    if (networkConnections.length > 10) {
      score += 2;
      reasons.push('擁有廣泛人脈網絡');
    }
    
    return Math.min(score, 10);
  }

  /**
   * 生成匹配解釋
   */
  async generateMatchingExplanation(member, extractedIntents, score, reasons) {
    try {
      const prompt = `
請為以下商業媒合結果生成一個簡潔、專業的推薦理由：

會員資訊：
- 姓名：${member.name}
- 公司：${member.company}
- 產業：${member.industry}
- 職稱：${member.title}

需求分析：
- 主要意圖：${extractedIntents.primary_intent}
- 需要技能：${extractedIntents.required_skills?.join('、') || '無特定要求'}
- 目標產業：${extractedIntents.target_industries?.join('、') || '無特定要求'}
- 合作類型：${extractedIntents.collaboration_type}

匹配分數：${score}分
匹配原因：${reasons.join('；')}

請生成一個50字以內的推薦理由，說明為什麼這位會員適合這個商業需求。
      `;
      
      const aiResponse = await this.geminiService.generateContent(prompt);
      return aiResponse.trim();
    } catch (error) {
      console.error('❌ 生成匹配解釋失敗:', error);
      return `根據${reasons.join('、')}等因素，該會員與您的需求匹配度為${score}分。`;
    }
  }

  /**
   * 儲存匹配結果到資料庫
   */
  async saveMatchingResults(wishId, matchingResults) {
    try {
      // 先刪除舊的匹配結果
      await pool.query('DELETE FROM ai_matching_results WHERE wish_id = $1', [wishId]);
      
      // 插入新的匹配結果
      for (const result of matchingResults) {
        await pool.query(`
          INSERT INTO ai_matching_results 
          (wish_id, matched_user_id, matching_score, matching_reasons, ai_explanation, status)
          VALUES ($1, $2, $3, $4, $5, 'pending')
        `, [
          wishId,
          result.member.id,
          result.score,
          JSON.stringify(result.reasons),
          result.explanation
        ]);
      }
      
      console.log(`✅ 已儲存 ${matchingResults.length} 個匹配結果`);
    } catch (error) {
      console.error('❌ 儲存匹配結果失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取會員的匹配結果
   */
  async getMatchingResultsForWish(wishId, limit = 10) {
    try {
      const result = await pool.query(`
        SELECT 
          amr.*,
          u.name, u.email, u.company, u.industry, u.title, u.profile_picture_url
        FROM ai_matching_results amr
        JOIN users u ON amr.matched_user_id = u.id
        WHERE amr.wish_id = $1
        ORDER BY amr.matching_score DESC
        LIMIT $2
      `, [wishId, limit]);
      
      return result.rows.map(row => ({
        id: row.id,
        matchingScore: parseFloat(row.matching_score),
        reasons: JSON.parse(row.matching_reasons || '[]'),
        explanation: row.ai_explanation,
        status: row.status,
        member: {
          id: row.matched_user_id,
          name: row.name,
          email: row.email,
          company: row.company,
          industry: row.industry,
          title: row.title,
          profilePicture: row.profile_picture_url
        },
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error('❌ 獲取匹配結果失敗:', error);
      throw error;
    }
  }

  /**
   * 主動掃描並推薦機會
   */
  async scanForOpportunities(userId) {
    try {
      // 獲取用戶的AI深度畫像
      const userProfile = await this.aiProfileService.getCurrentProfile(userId);
      
      // 獲取所有活躍的許願
      const wishesResult = await pool.query(`
        SELECT mw.*, u.name as wisher_name, u.company as wisher_company
        FROM member_wishes mw
        JOIN users u ON mw.user_id = u.id
        WHERE mw.status = 'active' AND mw.user_id != $1
        AND (mw.expires_at IS NULL OR mw.expires_at > CURRENT_TIMESTAMP)
        ORDER BY mw.created_at DESC
      `, [userId]);
      
      const opportunities = [];
      
      for (const wish of wishesResult.rows) {
        const extractedIntents = wish.ai_extracted_intents;
        if (!extractedIntents) continue;
        
        // 創建臨時會員物件進行匹配計算
        const userResult = await pool.query(
          'SELECT * FROM users WHERE id = $1',
          [userId]
        );
        
        if (userResult.rows.length === 0) continue;
        
        const user = userResult.rows[0];
        user.ai_deep_profile = userProfile;
        
        const matchingScore = await this.calculateMatchingScore(user, extractedIntents);
        
        if (matchingScore.score >= 70) { // 只推薦高匹配度的機會
          opportunities.push({
            wish,
            matchingScore: matchingScore.score,
            reasons: matchingScore.reasons,
            explanation: matchingScore.explanation
          });
        }
      }
      
      // 按匹配分數排序
      opportunities.sort((a, b) => b.matchingScore - a.matchingScore);
      
      return opportunities.slice(0, 5); // 返回前5個最佳機會
    } catch (error) {
      console.error('❌ 掃描機會失敗:', error);
      throw error;
    }
  }

  // 輔助方法
  isSkillMatch(required, available) {
    const requiredLower = required.toLowerCase();
    const availableLower = available.toLowerCase();
    return availableLower.includes(requiredLower) || requiredLower.includes(availableLower);
  }

  isIndustryMatch(target, member) {
    const targetLower = target.toLowerCase();
    const memberLower = member.toLowerCase();
    return memberLower.includes(targetLower) || targetLower.includes(memberLower);
  }

  isRoleMatch(target, member) {
    const targetLower = target.toLowerCase();
    const memberLower = member.toLowerCase();
    return memberLower.includes(targetLower) || targetLower.includes(memberLower);
  }

  isExperienceMatch(target, member) {
    const experienceHierarchy = {
      'junior': 1,
      'mid': 2,
      'senior': 3,
      'executive': 4,
      // 中文經驗等級對應
      '初級': 1,
      '中級': 2,
      '高級': 3,
      '資深': 3,
      '豐富經驗': 4,
      '專家': 4,
      '執行級': 4
    };
    
    const targetLevel = experienceHierarchy[target] || 2;
    const memberLevel = experienceHierarchy[member] || 2;
    
    return Math.abs(targetLevel - memberLevel) <= 1;
  }

  parseIntentAnalysis(aiResponse) {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return this.getDefaultIntentAnalysis();
    } catch (error) {
      console.error('❌ 解析意圖分析失敗:', error);
      return this.getDefaultIntentAnalysis();
    }
  }

  getDefaultIntentAnalysis() {
    return {
      primary_intent: '商業合作',
      secondary_intents: [],
      required_skills: [],
      target_industries: [],
      collaboration_type: 'partnership',
      urgency_level: 'medium',
      keywords: [],
      target_audience: {
        company_size: 'any',
        experience_level: 'any',
        specific_roles: []
      },
      success_criteria: []
    };
  }
}

module.exports = { AIMatchingService };