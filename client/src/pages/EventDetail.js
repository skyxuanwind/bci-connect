import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from '../config/axios';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [showInviteLink, setShowInviteLink] = useState(false);

  useEffect(() => {
    fetchEventDetail();
  }, [id]);

  const fetchEventDetail = async () => {
    try {
      const response = await axios.get(`/api/events/${id}`);
      
      if (response.data.success) {
        setEvent(response.data.event);
      } else {
        setError(response.data.message || '獲取活動詳情失敗');
      }
    } catch (error) {
      console.error('Error fetching event detail:', error);
      setError('網路錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setRegistering(true);
    try {
      const response = await axios.post(`/api/events/${id}/register`);
      
      if (response.data.success) {
        setEvent(prev => ({ ...prev, is_registered: true }));
        alert('報名成功！');
      } else {
        alert(response.data.message || '報名失敗');
      }
    } catch (error) {
      console.error('Error registering for event:', error);
      alert('網路錯誤，請稍後再試');
    } finally {
      setRegistering(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!window.confirm('確定要取消報名嗎？')) return;
    
    try {
      const response = await axios.delete(`/api/events/${id}/register`);
      
      if (response.data.success) {
        setEvent(prev => ({ ...prev, is_registered: false }));
        alert('取消報名成功！');
      } else {
        alert(response.data.message || '取消報名失敗');
      }
    } catch (error) {
      console.error('Error cancelling registration:', error);
      alert('網路錯誤，請稍後再試');
    }
  };

  const generateInviteLink = async () => {
    try {
      const response = await axios.get(`/api/events/${id}/invite-link`);
      
      if (response.data.success) {
        setInviteLink(response.data.invite_link);
        setShowInviteLink(true);
      } else {
        alert(response.data.message || '生成邀請連結失敗');
      }
    } catch (error) {
      console.error('Error generating invite link:', error);
      alert('網路錯誤，請稍後再試');
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    alert('邀請連結已複製到剪貼板！');
  };

  const formatDate = (dateString) => {
    // 直接從 ISO 字串建立 Date 物件，假設後端儲存的時間就是當地時間
    // 不使用 UTC 轉換，避免時區偏移
    const date = new Date(dateString.replace('Z', ''));
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'upcoming': { text: '即將舉行', class: 'bg-green-100 text-green-800' },
      'finished': { text: '已結束', class: 'bg-gray-100 text-gray-800' },
      'cancelled': { text: '已取消', class: 'bg-red-100 text-red-800' }
    };
    
    const statusInfo = statusMap[status] || { text: status, class: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.class}`}>
        {statusInfo.text}
      </span>
    );
  };

  const canRegister = () => {
    if (!event) return false;
    if (event.is_registered) return false;
    if (event.status !== 'upcoming') return false;
    if (new Date(event.event_date) <= new Date()) return false;
    if (event.max_attendees > 0 && event.registered_count >= event.max_attendees) return false;
    return true;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">載入失敗</h3>
          <p className="mt-1 text-sm text-gray-500">{error || '活動不存在'}</p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/events')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              返回活動列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/events')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回活動列表
          </button>
        </div>

        {/* Event Header */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Event Poster */}
          {event.poster_image_url && (
            <div className="w-full overflow-hidden bg-gray-50 flex items-center justify-center">
              <img
                src={event.poster_image_url}
                alt={event.title}
                className="w-full max-w-4xl mx-auto"
                onError={(e) => {
                  console.error('Image failed to load:', e.target.src);
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}
          
          <div className="p-6">
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
              {getStatusBadge(event.status)}
            </div>
            
            {/* Event Tag */}
            {event.tag && (
              <div className="mb-4">
                <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                  {event.tag}
                </span>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div className="flex items-center text-gray-600">
                  <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{formatDate(event.event_date)}</span>
                </div>
                
                {event.location && (
                  <div className="flex items-center text-gray-600">
                    <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{event.location}</span>
                  </div>
                )}
                
                <div className="flex items-center text-gray-600">
                  <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>
                    已報名: {event.registered_count}
                    {event.max_attendees > 0 && ` / ${event.max_attendees}`}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                {event.is_registered ? (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <div className="flex items-center">
                        <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-green-800 font-medium">您已報名此活動</span>
                      </div>
                    </div>
                    <button
                      onClick={handleCancelRegistration}
                      className="w-full bg-red-600 text-white px-4 py-2 rounded-md font-medium hover:bg-red-700 transition-colors duration-200"
                    >
                      取消報名
                    </button>
                    <button
                      onClick={generateInviteLink}
                      className="w-full btn-primary"
                    >
                      生成邀請連結
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleRegister}
                    disabled={!canRegister() || registering}
                    className={`w-full px-4 py-2 rounded-md font-medium transition-colors duration-200 ${
                      canRegister() && !registering
                        ? 'btn-primary'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {registering ? '報名中...' : canRegister() ? '立即報名' : '無法報名'}
                  </button>
                )}
              </div>
            </div>
            
            {event.description && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">活動描述</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Invite Link Modal */}
        {showInviteLink && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">邀請連結</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    分享此連結邀請朋友報名：
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 text-sm"
                    />
                    <button
                      onClick={copyInviteLink}
                      className="bg-blue-600 text-white px-4 py-2 rounded-r-md text-sm hover:bg-blue-700"
                    >
                      複製
                    </button>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowInviteLink(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    關閉
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Attendees List (for L1 and L2 members) */}
        {user.membership_level <= 2 && event.attendees && (
          <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">報名人員列表</h3>
              {event.attendees.length === 0 ? (
                <p className="text-gray-500">暫無報名人員</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          姓名
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          公司
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          職位
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          報名時間
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {event.attendees.map((attendee) => (
                        <tr key={attendee.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {attendee.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {attendee.company || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {attendee.title || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(attendee.registration_date).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetail;