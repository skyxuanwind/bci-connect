import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const MeetingScheduler = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('calendar');
  const [meetings, setMeetings] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberAvailability, setMemberAvailability] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 新增會議表單狀態
  const [newMeeting, setNewMeeting] = useState({
    attendee_id: '',
    meeting_date: '',
    start_time: '',
    end_time: '',
    notes: ''
  });

  useEffect(() => {
    fetchMeetings();
    fetchMembers();
  }, []);

  const fetchMeetings = async () => {
    try {
      const response = await axios.get('/api/meetings/my-meetings');
      setMeetings(response.data);
    } catch (error) {
      console.error('獲取會議列表失敗:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await axios.get('/api/users/members', { params: { limit: 100 } });
      setMembers(response.data.members.filter(member => member.id !== user.id));
    } catch (error) {
      console.error('獲取會員列表失敗:', error);
    }
  };

  const fetchMemberAvailability = async (memberId, startDate, endDate) => {
    try {
      const response = await axios.get(`/api/meetings/availability/${memberId}`, {
        params: { start_date: startDate, end_date: endDate }
      });
      setMemberAvailability(response.data);
    } catch (error) {
      console.error('獲取會員可用時間失敗:', error);
    }
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const meetingTimeStart = `${newMeeting.meeting_date}T${newMeeting.start_time}:00`;
      const meetingTimeEnd = `${newMeeting.meeting_date}T${newMeeting.end_time}:00`;

      await axios.post('/api/meetings/create', {
        attendee_id: newMeeting.attendee_id,
        meeting_time_start: meetingTimeStart,
        meeting_time_end: meetingTimeEnd,
        notes: newMeeting.notes
      });

      setSuccess('會議邀請已成功發送！');
      setNewMeeting({
        attendee_id: '',
        meeting_date: '',
        start_time: '',
        end_time: '',
        notes: ''
      });
      fetchMeetings();
      setActiveTab('meetings');
    } catch (error) {
      setError(error.response?.data?.error || '創建會議失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToMeeting = async (meetingId, status) => {
    try {
      await axios.put(`/api/meetings/${meetingId}/respond`, { status });
      setSuccess(`會議已${status === 'confirmed' ? '確認' : '取消'}`);
      fetchMeetings();
    } catch (error) {
      setError(error.response?.data?.error || '操作失敗');
    }
  };

  const handleCancelMeeting = async (meetingId) => {
    try {
      await axios.delete(`/api/meetings/${meetingId}`);
      setSuccess('會議已取消');
      fetchMeetings();
    } catch (error) {
      setError(error.response?.data?.error || '取消會議失敗');
    }
  };

  const handleMemberSelect = (memberId) => {
    const member = members.find(m => m.id === parseInt(memberId));
    setSelectedMember(member);
    setNewMeeting({ ...newMeeting, attendee_id: memberId });
    
    // 獲取該會員未來7天的可用時間
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startDate = today.toISOString().split('T')[0];
    const endDate = nextWeek.toISOString().split('T')[0];
    
    fetchMemberAvailability(memberId, startDate, endDate);
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { text: '待確認', class: 'bg-yellow-100 text-yellow-800' },
      confirmed: { text: '已確認', class: 'bg-green-100 text-green-800' },
      cancelled: { text: '已取消', class: 'bg-red-100 text-red-800' }
    };
    const statusInfo = statusMap[status] || { text: status, class: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.class}`}>
        {statusInfo.text}
      </span>
    );
  };

  const getMeetingTypeBadge = (type) => {
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        type === 'sent' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
      }`}>
        {type === 'sent' ? '我發起' : '我受邀'}
      </span>
    );
  };

  const isTimeSlotBusy = (date, startTime, endTime) => {
    if (!memberAvailability) return false;
    
    const checkStart = new Date(`${date}T${startTime}:00`);
    const checkEnd = new Date(`${date}T${endTime}:00`);
    
    return memberAvailability.busy_times.some(busyTime => {
      const busyStart = new Date(busyTime.meeting_time_start);
      const busyEnd = new Date(busyTime.meeting_time_end);
      
      return (
        (checkStart >= busyStart && checkStart < busyEnd) ||
        (checkEnd > busyStart && checkEnd <= busyEnd) ||
        (checkStart <= busyStart && checkEnd >= busyEnd)
      );
    });
  };

  // 檢查用戶權限
  if (!user || user.membershipLevel > 3) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">權限不足</h2>
          <p className="text-gray-600">只有會員以上才能使用會議預約系統</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">商務面談預約</h1>
          <p className="mt-2 text-gray-600">安排和管理您的商務會議</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* 標籤頁 */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`py-3 px-4 border-b-2 font-semibold text-base rounded-t-lg transition-all duration-200 ${
                  activeTab === 'schedule'
                    ? 'border-purple-500 text-purple-700 bg-purple-50 shadow-sm'
                    : 'border-transparent text-gray-500 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50'
                }`}
              >
                📅 預約會議
              </button>
              <button
                onClick={() => setActiveTab('meetings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'meetings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                我的會議
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* 預約會議標籤 */}
            {activeTab === 'schedule' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 預約表單 */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">預約新會議</h3>
                  <form onSubmit={handleCreateMeeting} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        選擇會員
                      </label>
                      <select
                        value={newMeeting.attendee_id}
                        onChange={(e) => handleMemberSelect(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">請選擇會員</option>
                        {members.map(member => (
                          <option key={member.id} value={member.id}>
                            {member.name} - {member.company}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        會議日期
                      </label>
                      <input
                        type="date"
                        value={newMeeting.meeting_date}
                        onChange={(e) => setNewMeeting({ ...newMeeting, meeting_date: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          開始時間
                        </label>
                        <input
                          type="time"
                          value={newMeeting.start_time}
                          onChange={(e) => setNewMeeting({ ...newMeeting, start_time: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          結束時間
                        </label>
                        <input
                          type="time"
                          value={newMeeting.end_time}
                          onChange={(e) => setNewMeeting({ ...newMeeting, end_time: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>

                    {/* 時間衝突警告 */}
                    {newMeeting.meeting_date && newMeeting.start_time && newMeeting.end_time && 
                     isTimeSlotBusy(newMeeting.meeting_date, newMeeting.start_time, newMeeting.end_time) && (
                      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-2 rounded text-sm">
                        ⚠️ 該時間段與對方已有會議衝突
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        會議備註
                      </label>
                      <textarea
                        value={newMeeting.notes}
                        onChange={(e) => setNewMeeting({ ...newMeeting, notes: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="請描述會議目的或其他備註..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || (newMeeting.meeting_date && newMeeting.start_time && newMeeting.end_time && 
                               isTimeSlotBusy(newMeeting.meeting_date, newMeeting.start_time, newMeeting.end_time))}
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 px-6 rounded-lg text-lg font-semibold shadow-lg hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-4 focus:ring-purple-300 disabled:opacity-50 transform hover:scale-105 transition-all duration-200"
                    >
                      {loading ? '🔄 發送中...' : '📅 預約會議'}
                    </button>
                  </form>
                </div>

                {/* 會員可用時間 */}
                <div>
                  {selectedMember && memberAvailability ? (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        {selectedMember.name} 的日程安排
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-3">
                          以下是 {selectedMember.name} 未來7天的已確認會議時間：
                        </p>
                        {memberAvailability.busy_times.length === 0 ? (
                          <p className="text-sm text-green-600">該會員未來7天暫無已確認的會議</p>
                        ) : (
                          <div className="space-y-2">
                            {memberAvailability.busy_times.map((busyTime, index) => (
                              <div key={index} className="bg-red-100 text-red-800 px-3 py-2 rounded text-sm">
                                {formatDateTime(busyTime.meeting_time_start)} - {formatDateTime(busyTime.meeting_time_end)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <p>請先選擇會員以查看其日程安排</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 我的會議標籤 */}
            {activeTab === 'meetings' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">我的會議</h3>
                {meetings.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">暫無會議記錄</p>
                ) : (
                  <div className="space-y-4">
                    {meetings.map(meeting => (
                      <div key={meeting.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              與 {meeting.other_party_name} ({meeting.other_party_company}) 的會議
                            </h4>
                            <p className="text-sm text-gray-600">
                              時間：{formatDateTime(meeting.meeting_time_start)} - {formatDateTime(meeting.meeting_time_end)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getMeetingTypeBadge(meeting.meeting_type)}
                            {getStatusBadge(meeting.status)}
                          </div>
                        </div>
                        {meeting.notes && (
                          <p className="text-sm text-gray-700 mb-3">{meeting.notes}</p>
                        )}
                        {meeting.status === 'pending' && (
                          <div className="flex space-x-2">
                            {meeting.meeting_type === 'received' ? (
                              <>
                                <button
                                  onClick={() => handleRespondToMeeting(meeting.id, 'confirmed')}
                                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                                >
                                  確認
                                </button>
                                <button
                                  onClick={() => handleRespondToMeeting(meeting.id, 'cancelled')}
                                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                >
                                  拒絕
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleCancelMeeting(meeting.id)}
                                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                              >
                                取消會議
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingScheduler;