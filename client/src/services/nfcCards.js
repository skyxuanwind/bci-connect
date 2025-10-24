import api from './api';

// 获取用户的 NFC 名片
export const getMyCard = async () => {
  try {
    const response = await api.get('/nfc-cards/my-card');
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
    const response = await api.get('/nfc-cards/templates');
    return response.data;
  } catch (error) {
    console.error('获取模板失败:', error);
    throw error;
  }
};

// 保存用户的 NFC 名片
export const saveMyCard = async (cardData) => {
  try {
    const response = await api.post('/nfc-cards/my-card', cardData);
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
    formData.append('image', file);
    
    const response = await api.post('/nfc-cards/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('上传图片失败:', error);
    throw error;
  }
};