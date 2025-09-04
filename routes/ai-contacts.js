const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const geminiService = require('../services/geminiService');

const router = express.Router();

// 跟進建議：由名片/聯絡人資訊生成 AI 建議與訊息草稿
// POST /api/ai/contacts/followup-suggestion
// 建議傳入：{ name, company, title, email, phone, tags:[], notes:'', last_interaction, goal, channelPreference }
router.post('/contacts/followup-suggestion', authenticateToken, async (req, res) => {
  try {
    const {
      name = '',
      company = '',
      title = '',
      email = '',
      phone = '',
      tags = [],
      notes = '',
      last_interaction = '',
      goal = '建立關係並安排會談',
      channelPreference = ''
    } = req.body || {};

    // 基於提供的資料推測建議的溝通管道
    const inferredChannel = channelPreference || (email ? 'email' : (phone ? 'sms' : 'message'));

    const prompt = `你是一位兼具商務禮儀與行銷洞察的助理。請針對以下聯絡人，產生「實用且具體」的跟進建議與訊息草稿，輸出為 JSON，務必遵循下列格式且嚴格只輸出 JSON：
{
  "suggestions": ["...三則具體建議..."],
  "draft": {
    "channel": "email|sms|message",
    "subject": "若為 email，提供 1 句精煉主旨；若非 email 可為空字串",
    "message": "給對方的一段訊息內容，150-300字，口吻專業且友善，避免過度推銷，適度個人化，結尾含具體下一步（如提議 2-3 個時段）"
  },
  "next_steps": ["三到四個可執行的下一步"],
  "followup_timeline": "建議的跟進節奏，例如：首次訊息後 3 天再次跟進，兩週後回顧"
}

聯絡人資料：
- 姓名：${name}
- 公司/單位：${company}
- 職稱：${title}
- Email：${email}
- Phone：${phone}
- 標籤：${Array.isArray(tags) ? tags.join(', ') : ''}
- 個人備註：${notes}
- 最近互動：${last_interaction}
- 本次目標：${goal}
- 偏好管道：${inferredChannel}

要求：
1) 全程使用繁體中文。
2) 建議具體、可執行，適度個人化，避免空泛陳述。
3) 若資訊不足，合宜地假設情境，但不要編造個人隱私或虛構事件。
4) JSON 欄位齊全且不多出其他欄位。`;

    let aiText = '';
    try {
      aiText = await geminiService.generateContent(prompt);
    } catch (e) {
      console.warn('Gemini 生成內容失敗，改用規則式輸出:', e?.message);
      aiText = '';
    }

    let parsed = null;
    if (aiText && typeof aiText === 'string') {
      // 嘗試清除程式碼區塊標記
      const cleaned = aiText.replace(/^```[a-zA-Z]*\n|\n```$/g, '').trim();
      try { parsed = JSON.parse(cleaned); } catch {}
    }

    // 規則式備援
    if (!parsed) {
      parsed = {
        suggestions: [
          `在 1-2 天內發送首次問候，簡短回憶相識情境並附上價值（如分享與 ${company || '對方公司'} 相關的資源或文章）。`,
          `針對 ${goal} 提出明確下一步（如安排 20 分鐘線上交流），提供 2-3 個時段選項，降低對方回覆成本。`,
          `若未回覆，於 3-5 天後委婉跟進，換一個角度提供幫助（如介紹潛在資源或詢問當前挑戰）。`
        ],
        draft: {
          channel: inferredChannel,
          subject: email ? `${name || ''}，想與您簡短交流以相互了解合作機會` : '',
          message: `您好${name ? '，' + name : ''}：\n\n很高興先前能與您認識${company ? '（' + company + '）' : ''}。我近期關注到${tags && tags.length ? '與「' + tags.join('、') + '」相關的主題' : '相關產業動向'}，覺得彼此也許有機會交換一些想法，看看是否能為您帶來實質幫助。\n\n若您方便，我想提議一個約 20 分鐘的線上交流，時間可為：\n- 本週三 10:30-11:00\n- 本週四 14:00-14:30\n- 本週五 16:00-16:30\n也很樂意依您的時段調整。\n\n若您目前有特別想解決的課題，也歡迎提前告訴我，我會準備相關資源供您參考。\n\n謝謝您，期待您的回覆！`
        },
        next_steps: [
          '發送首次訊息並記錄對方回覆情況',
          '3-5 天後若未回覆則以不同角度再次跟進',
          '成功約到會談後整理議程與彼此期待',
          '會後 24 小時內寄送重點摘要與兩項可行行動'
        ],
        followup_timeline: '首次訊息後 3-5 天再次跟進；若仍無回覆，2 週後以新資源/觀點再次觸達'
      };
    }

    res.json({ success: true, data: parsed });
  } catch (error) {
    console.error('AI 跟進建議端點錯誤:', error);
    res.status(500).json({ success: false, message: '無法生成跟進建議', error: error.message });
  }
});

module.exports = router;