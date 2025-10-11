const db = require('../config/database');
const vCard = require('vcards-js');

// 獲取所有可用模板
const getTemplates = async (req, res) => {
  try {
    const query = `
      SELECT id, name, description, css_config, preview_image_url
      FROM nfc_card_templates 
      WHERE is_active = true 
      ORDER BY display_order ASC
    `;
    
    const result = await db.query(query);
    
    res.json({
      success: true,
      templates: result.rows
    });
  } catch (error) {
    console.error('獲取模板失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取模板失敗'
    });
  }
};

// 獲取當前會員的名片配置
const getMyCard = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 獲取名片基本配置
    const cardQuery = `
      SELECT 
        nc.*,
        nct.name as template_name,
        nct.css_config
      FROM nfc_cards nc
      LEFT JOIN nfc_card_templates nct ON nc.template_id = nct.id
      WHERE nc.user_id = $1
    `;
    
    const cardResult = await db.query(cardQuery, [userId]);
    
    if (cardResult.rows.length === 0) {
      // 如果沒有名片配置，創建默認配置
      const defaultTemplateQuery = 'SELECT id FROM nfc_card_templates WHERE is_active = true ORDER BY display_order ASC LIMIT 1';
      const defaultTemplate = await db.query(defaultTemplateQuery);
      
      const createCardQuery = `
        INSERT INTO nfc_cards (user_id, template_id, card_title, card_subtitle, is_active)
        VALUES ($1, $2, $3, $4, true)
        RETURNING *
      `;
      
      const userQuery = 'SELECT name, email FROM users WHERE id = $1';
      const userResult = await db.query(userQuery, [userId]);
      const user = userResult.rows[0];
      
      const newCard = await db.query(createCardQuery, [
        userId,
        defaultTemplate.rows[0]?.id || 1,
        user.name || '我的名片',
        user.email || ''
      ]);
      
      return res.json({
        success: true,
        cardConfig: {
          ...newCard.rows[0],
          content_blocks: []
        }
      });
    }
    
    // 獲取內容區塊
    const contentQuery = `
      SELECT *
      FROM nfc_content_blocks
      WHERE card_id = $1
      ORDER BY display_order ASC
    `;
    
    const contentResult = await db.query(contentQuery, [cardResult.rows[0].id]);
    
    const cardConfig = {
      ...cardResult.rows[0],
      content_blocks: contentResult.rows
    };
    
    res.json({
      success: true,
      cardConfig
    });
  } catch (error) {
    console.error('獲取名片配置失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取名片配置失敗'
    });
  }
};

// 更新名片基本信息（支持局部更新與 UI 顯示旗標、頭像網址）
const updateMyCard = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      card_title,
      card_subtitle,
      template_id,
      custom_css,
      // 追加支持的欄位：UI 顯示旗標與頭像網址
      ui_show_avatar,
      ui_show_name,
      ui_show_company,
      ui_show_contacts,
      avatar_url
    } = req.body;

    // 使用 COALESCE 保持未提供欄位的原值，避免覆蓋為 NULL
    const query = `
      UPDATE nfc_cards 
      SET 
        card_title      = COALESCE($1, card_title),
        card_subtitle   = COALESCE($2, card_subtitle),
        template_id     = COALESCE($3, template_id),
        custom_css      = COALESCE($4, custom_css),
        ui_show_avatar  = COALESCE($5, ui_show_avatar),
        ui_show_name    = COALESCE($6, ui_show_name),
        ui_show_company = COALESCE($7, ui_show_company),
        ui_show_contacts= COALESCE($8, ui_show_contacts),
        avatar_url      = COALESCE($9, avatar_url),
        updated_at      = CURRENT_TIMESTAMP
      WHERE user_id = $10
      RETURNING *
    `;

    const result = await db.query(query, [
      card_title ?? null,
      card_subtitle ?? null,
      template_id ?? null,
      custom_css ?? null,
      ui_show_avatar ?? null,
      ui_show_name ?? null,
      ui_show_company ?? null,
      ui_show_contacts ?? null,
      avatar_url ?? null,
      userId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '名片不存在' });
    }

    res.json({ success: true, message: '名片更新成功', card: result.rows[0] });
  } catch (error) {
    console.error('更新名片失敗:', error);
    res.status(500).json({ success: false, message: '更新名片失敗' });
  }
};

// 更新名片內容區塊
const updateMyCardContent = async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const userId = req.user.id;
    const { content_blocks } = req.body;
    
    // 獲取名片ID
    const cardQuery = 'SELECT id FROM nfc_cards WHERE user_id = $1';
    const cardResult = await client.query(cardQuery, [userId]);
    
    if (cardResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: '名片不存在'
      });
    }
    
    const cardId = cardResult.rows[0].id;
    
    // 刪除現有內容區塊
    await client.query('DELETE FROM nfc_content_blocks WHERE card_id = $1', [cardId]);
    
    // 插入新的內容區塊
    if (content_blocks && content_blocks.length > 0) {
      const insertQuery = `
         INSERT INTO nfc_content_blocks 
         (card_id, block_type, title, content, url, image_url, social_platform, map_address, map_coordinates, display_order, is_visible, custom_styles)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `;
      
      for (let i = 0; i < content_blocks.length; i++) {
        const block = content_blocks[i] || {};
        const blockType = block.block_type || block.content_type;
        const data = block.content_data || {};

        const title = block.title ?? data.title ?? null;
        let content = block.content ?? data.content ?? null;
        const url = block.url ?? data.url ?? null;
        const image_url = block.image_url ?? data.image_url ?? null;
        const social_platform = block.social_platform ?? data.social_platform ?? null;
        const map_address = block.map_address ?? data.address ?? data.map_address ?? null;
        const map_coordinates = block.map_coordinates ?? data.coordinates ?? null;

        // 社群類型：將複雜資料以 JSON 字串保存到 content 欄位
        if (blockType === 'social' && !content) {
          try {
            content = JSON.stringify(data);
          } catch (e) {
            content = null;
          }
        }

        await client.query(insertQuery, [
          cardId,
          blockType,
          title,
          content,
          url,
          image_url,
          social_platform,
          map_address,
          map_coordinates,
          Number.isInteger(block.display_order) ? block.display_order : i,
          block.is_visible !== false, // 默認為 true
          JSON.stringify(block.custom_styles || {})
        ]);
      }
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: '內容更新成功'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('更新內容失敗:', error);
    res.status(500).json({
      success: false,
      message: '更新內容失敗'
    });
  } finally {
    client.release();
  }
};

// 獲取指定會員的公開名片（無需認證）
const getMemberCard = async (req, res) => {
  try {
    const { memberId } = req.params;
    
    // 獲取名片基本信息和用戶信息
    const cardQuery = `
      SELECT 
        nc.*,
        nct.name as template_name,
        nct.css_config,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        u.company as user_company,
        u.position as user_position,
        u.address as user_address,
        u.website as user_website
      FROM nfc_cards nc
      LEFT JOIN nfc_card_templates nct ON nc.template_id = nct.id
      LEFT JOIN users u ON nc.user_id = u.id
      WHERE nc.user_id = $1 AND nc.is_active = true
    `;
    
    const cardResult = await db.query(cardQuery, [memberId]);
    
    if (cardResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '名片不存在或未啟用'
      });
    }
    
    const card = cardResult.rows[0];
    
    // 獲取內容區塊
    const contentQuery = `
      SELECT *
      FROM nfc_content_blocks
      WHERE card_id = $1 AND is_visible = true
      ORDER BY display_order ASC
    `;
    
    const contentResult = await db.query(contentQuery, [card.id]);
    
    // 解析 JSON 字段
    const contentBlocks = contentResult.rows.map(block => ({
      ...block,
      content_data: typeof block.content_data === 'string' 
        ? JSON.parse(block.content_data) 
        : block.content_data,
      custom_styles: typeof block.custom_styles === 'string' 
        ? JSON.parse(block.custom_styles) 
        : block.custom_styles
    }));
    
    // 組合聯絡資訊
    const contactInfo = {
      name: card.user_name,
      email: card.user_email,
      phone: card.user_phone,
      company: card.user_company,
      position: card.user_position,
      address: card.user_address,
      website: card.user_website
    };
    
    const responseData = {
      id: parseInt(memberId),
      card_title: card.card_title,
      card_subtitle: card.card_subtitle,
      template_id: card.template_id,
      template_name: card.template_name,
      css_config: card.css_config,
      custom_css: card.custom_css,
      contact_info: contactInfo,
      content_blocks: contentBlocks,
      created_at: card.created_at,
      updated_at: card.updated_at
    };
    
    res.json(responseData);
  } catch (error) {
    console.error('獲取會員名片失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取名片失敗'
    });
  }
};

// 生成並下載 vCard 文件
const generateVCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    
    // 獲取名片和用戶信息
    const query = `
      SELECT 
        nc.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        u.company as user_company,
        u.position as user_position,
        u.address as user_address,
        u.website as user_website
      FROM nfc_cards nc
      LEFT JOIN users u ON nc.user_id = u.id
      WHERE nc.user_id = $1 AND nc.is_active = true
    `;
    
    const result = await db.query(query, [cardId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '名片不存在'
      });
    }
    
    const card = result.rows[0];
    
    // 創建 vCard
    const vcard = vCard();
    
    // 基本信息
    if (card.user_name) {
      const nameParts = card.user_name.split(' ');
      vcard.firstName = nameParts[0] || '';
      vcard.lastName = nameParts.slice(1).join(' ') || '';
    }
    
    if (card.user_email) {
      vcard.email = card.user_email;
    }
    
    if (card.user_phone) {
      vcard.cellPhone = card.user_phone;
    }
    
    if (card.user_company) {
      vcard.organization = card.user_company;
    }
    
    if (card.user_position) {
      vcard.title = card.user_position;
    }
    
    if (card.user_website) {
      vcard.url = card.user_website;
    }
    
    if (card.user_address) {
      vcard.workAddress.label = 'Work Address';
      vcard.workAddress.street = card.user_address;
    }
    
    // 添加名片頁面 URL
    const cardUrl = `${req.protocol}://${req.get('host')}/member-card/${cardId}`;
    vcard.note = `電子名片: ${cardUrl}`;
    
    // 設置響應頭
    const filename = `${card.card_title || card.user_name || 'contact'}.vcf`;
    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // 發送 vCard 內容
    res.send(vcard.getFormattedString());
  } catch (error) {
    console.error('生成 vCard 失敗:', error);
    res.status(500).json({
      success: false,
      message: '生成 vCard 失敗'
    });
  }
};

module.exports = {
  getTemplates,
  getMyCard,
  updateMyCard,
  updateMyCardContent,
  getMemberCard,
  generateVCard
};