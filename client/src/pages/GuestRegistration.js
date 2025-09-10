import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';

const GuestRegistration = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [event, setEvent] = useState(null);
  const [inviter, setInviter] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm();

  const eventId = searchParams.get('event_id');
  const inviterId = searchParams.get('inviter_id');

  // 載入活動和邀請人資訊
  useEffect(() => {
    const loadEventInfo = async () => {
      if (!eventId || !inviterId) {
        navigate('/');
        return;
      }

      try {
        // 獲取活動資訊
        const eventResponse = await axios.get(`/api/events/${eventId}/public`);
        if (eventResponse.data.success) {
          setEvent(eventResponse.data.event);
        }

        // 獲取邀請人資訊
        const inviterResponse = await axios.get(`/api/users/${inviterId}/public`);
        if (inviterResponse.data.success) {
          setInviter(inviterResponse.data.user);
        }
      } catch (error) {
        console.error('Error loading event info:', error);
        alert('載入活動資訊失敗');
        navigate('/');
      } finally {
        setLoadingEvent(false);
      }
    };

    loadEventInfo();
  }, [eventId, inviterId, navigate]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    
    try {
      const response = await axios.post('/api/events/guest-registration', {
        ...data,
        event_id: eventId,
        inviter_id: inviterId
      });
      
      if (response.data.success) {
        alert('報名成功！我們會盡快與您聯繫。');
        navigate('/');
      } else {
        setError('root', {
          type: 'manual',
          message: response.data.message
        });
      }
    } catch (error) {
      console.error('Error submitting guest registration:', error);
      setError('root', {
        type: 'manual',
        message: '報名過程中發生錯誤，請稍後再試'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long',
      timeZone: 'Asia/Taipei'
    });
  };

  if (loadingEvent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!event || !inviter) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">活動不存在</h2>
          <p className="text-gray-600 mb-4">抱歉，找不到相關的活動資訊。</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 活動資訊卡片 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">活動報名</h1>
          
          {/* 活動圖片 */}
          {event.poster_image_url && (
            <div className="mb-6">
              <img 
                src={event.poster_image_url} 
                alt={event.title}
                className="w-full max-h-160 object-contain rounded-lg bg-gray-50"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}
          
          <div className="border-l-4 border-blue-500 pl-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">{event.title}</h2>
            <div className="space-y-2 text-gray-600">
              <p><span className="font-medium">時間：</span>{formatDate(event.event_date)}</p>
              {event.location && (
                <p><span className="font-medium">地點：</span>{event.location}</p>
              )}
              {inviter && (
                <p><span className="font-medium">邀請人：</span>{inviter.name} ({inviter.company})</p>
              )}
            </div>
          </div>

          {event.description && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-2">活動描述</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* 活動詳細資訊 */}
          {(event.max_participants || event.registration_deadline || event.contact_info) && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-2">活動詳細資訊</h3>
              <div className="space-y-2 text-gray-600">
                {event.max_participants && (
                  <p><span className="font-medium">參與人數限制：</span>{event.max_participants} 人</p>
                )}
                {event.registration_deadline && (
                  <p><span className="font-medium">報名截止：</span>{formatDate(event.registration_deadline)}</p>
                )}
                {event.contact_info && (
                  <p><span className="font-medium">聯絡資訊：</span>{event.contact_info}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 報名表單 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">來賓報名資訊</h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 姓名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                姓名 *
              </label>
              <input
                type="text"
                {...register('name', { required: '請輸入姓名' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="請輸入您的姓名"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* 電話 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                聯絡電話 *
              </label>
              <input
                type="tel"
                {...register('phone', { required: '請輸入聯絡電話' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="請輸入您的聯絡電話"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            {/* 信箱 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                電子信箱 *
              </label>
              <input
                type="email"
                {...register('email', { 
                  required: '請輸入電子信箱',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: '請輸入有效的電子信箱'
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="請輸入您的電子信箱"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* 公司 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                公司名稱 *
              </label>
              <input
                type="text"
                {...register('company', { required: '請輸入公司名稱' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="請輸入您的公司名稱"
              />
              {errors.company && (
                <p className="mt-1 text-sm text-red-600">{errors.company.message}</p>
              )}
            </div>

            {/* 產業別 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                產業別 *
              </label>
              <input
                type="text"
                {...register('industry', { required: '請輸入產業別' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="請輸入您的產業別"
              />
              {errors.industry && (
                <p className="mt-1 text-sm text-red-600">{errors.industry.message}</p>
              )}
            </div>

            {/* 想要連結什麼人脈 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                想要連結什麼人脈
              </label>
              <textarea
                {...register('desired_connections')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="請描述您希望在此活動中連結的人脈類型或目標"
              />
            </div>

            {/* 錯誤訊息 */}
            {errors.root && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-600">{errors.root.message}</p>
              </div>
            )}

            {/* 提交按鈕 */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '報名中...' : '確認報名'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GuestRegistration;