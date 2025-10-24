import api from './api';

// 获取用户的 NFC 名片
export const getMyCard = async () => {
  try {
    const response = await api.get('/api/nfc-cards/my-card');
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      // 用户还没有名片，返回空数据
      return { card: null, content: [] };
    }
    throw error;
  }
};

// 获取所有可用模板
export const getTemplates = async () => {
  try {
    const response = await api.get('/api/nfc-cards/templates');
    return response.data;
  } catch (error) {
    console.error('获取模板失败:', error);
    throw error;
  }
};

// 保存用户的 NFC 名片
export const saveMyCard = async (cardData) => {
  try {
    const response = await api.post('/api/nfc-cards/my-card', cardData);
    return response.data;
  } catch (error) {
    console.error('保存名片失败:', error);
    throw error;
  }
};

// 上传图片
export const uploadImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/nfc-cards/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    // 後端回傳 { success, message, data: { url, ... } }
    // 為了兼容現有使用處，直接回傳 data 物件，讓呼叫端可用 r.url
    return response.data?.data || response.data;
  } catch (error) {
    console.error('上传图片失败:', error);
    throw error;
  }
};