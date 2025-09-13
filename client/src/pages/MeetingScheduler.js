import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from '../config/axios';

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
  // 新增：表單錯誤與高亮新建會議
  const [formErrors, setFormErrors] = useState({});
  const [highlightedMeetingId, setHighlightedMeetingId] = useState(null);

  // 新增：會議回饋 Modal 狀態
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackMeeting, setFeedbackMeeting] = useState(null);
  const [feedbackStatus, setFeedbackStatus] = useState(null); // { canSubmit, alreadySubmitted, myFeedback, otherFeedback }
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComments, setFeedbackComments] = useState('');
  // 會議回饋摘要（每個會議：{ my: number|null, other: number|null }）
  const [feedbackSummaries, setFeedbackSummaries] = useState({});
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

  // 批次載入每個會議的回饋摘要
  useEffect(() => {
    let cancelled = false;
    const loadFeedbackSummaries = async () => {
      try {
        if (!meetings || meetings.length === 0) {
          if (!cancelled) setFeedbackSummaries({});
          return;
        }
        const results = await Promise.all(
          meetings.map(async (m) => {
            try {
              const { data } = await axios.get(`/api/feedback/meeting/${m.id}/status`);
              return [
                m.id,
                {
                  my: data.myFeedback?.rating ?? null,
                  other: data.otherFeedback?.rating ?? null,
                },
              ];
            } catch (e) {
              return [m.id, { my: null, other: null }];
            }
          })
        );
        if (!cancelled) {
          const map = {};
          results.forEach(([id, summary]) => {
            map[id] = summary;
          });
          setFeedbackSummaries(map);
        }
      } catch (_) {}
    };
    loadFeedbackSummaries();
    return () => {
      cancelled = true;
    };
  }, [meetings.length]);
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

  // 新增：表單校驗
  const validateForm = () => {
    const errors = {};
    const { attendee_id, meeting_date, start_time, end_time } = newMeeting;

    if (!attendee_id) {
      errors.attendee_id = '請選擇受邀者';
    } else if (parseInt(attendee_id, 10) === user?.id) {
      errors.attendee_id = '不能邀請自己作為受邀者';
    }

    if (!meeting_date) {
      errors.meeting_date = '請選擇日期';
    }
    if (!start_time) {
      errors.start_time = '請選擇開始時間';
    }
    if (!end_time) {
      errors.end_time = '請選擇結束時間';
    }

    if (meeting_date && start_time && end_time) {
      const start = new Date(`${meeting_date}T${start_time}:00`);
      const end = new Date(`${meeting_date}T${end_time}:00`);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        errors.time_format = '時間格式不正確';
      } else {
        if (start >= end) {
          errors.time_order = '結束時間必須晚於開始時間';
        }
        const now = new Date();
        if (start < now) {
          errors.time_past = '會議時間不能是過去時間';
        }
      }

      // 衝突檢查（僅在已選擇會員且有可用性資料時）
      if (
        selectedMember &&
        memberAvailability &&
        memberAvailability.busy_times &&
        memberAvailability.busy_times.length > 0
      ) {
        const conflict = isTimeSlotBusy(meeting_date, start_time, end_time);
        if (conflict) {
          errors.time_conflict = '該時間段與對方已有會議衝突';
        }
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  };

  // 即時校驗：當表單任何一項變更時，更新錯誤
  useEffect(() => {
    const { errors } = validateForm();
    setFormErrors(errors);
  }, [newMeeting, selectedMember, memberAvailability]);

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const { valid, errors } = validateForm();
    if (!valid) {
      setFormErrors(errors);
      // 顯示第一條錯誤作為頂部提示
      const firstError = Object.values(errors)[0];
      if (firstError) setError(firstError);
      return;
    }

    setLoading(true);
    try {
      const meetingTimeStart = `${newMeeting.meeting_date}T${newMeeting.start_time}:00`;
      const meetingTimeEnd = `${newMeeting.meeting_date}T${newMeeting.end_time}:00`;

      const { data } = await axios.post('/api/meetings/create', {
        attendee_id: newMeeting.attendee_id,
        meeting_time_start: meetingTimeStart,
        meeting_time_end: meetingTimeEnd,
        notes: newMeeting.notes
      });

      const createdId = data?.meeting?.id;

      setSuccess('會議邀請已成功發送！');
      setNewMeeting({
        attendee_id: '',
        meeting_date: '',
        start_time: '',
        end_time: '',
        notes: ''
      });
      setSelectedMember(null);
      setMemberAvailability(null);

      // 先抓取最新清單，再切到「我的會議」，並高亮新項
      await fetchMeetings();
      setActiveTab('meetings');

      if (createdId) {
        setHighlightedMeetingId(createdId);
        // 滾動到新建的會議卡片
        setTimeout(() => {
          try {
            const el = document.getElementById(`meeting-${createdId}`);
            if (el && typeof el.scrollIntoView === 'function') {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          } catch (_) {}
        }, 150);
      }
    } catch (error) {
      setError(error.response?.data?.error || '創建會議失敗');
    } finally {
      setLoading(false);
    }
  };

  // 高亮效果在幾秒後自動移除
  useEffect(() => {
    if (!highlightedMeetingId) return;
    const t = setTimeout(() => setHighlightedMeetingId(null), 6000);
    return () => clearTimeout(t);
  }, [highlightedMeetingId]);

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
      minute: '2-digit',
      timeZone: 'Asia/Taipei'
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

  // 會議回饋：工具與動作（移至 JSX 之外）
  const isMeetingEnded = (meeting) => {
    try {
      return new Date(meeting.meeting_time_end) <= new Date();
    } catch (e) {
      return false;
    }
  };

  const openFeedbackModal = async (meeting) => {
    setFeedbackError('');
    setFeedbackMeeting(meeting);
    setFeedbackModalOpen(true);
    setFeedbackLoading(true);
    try {
      const { data } = await axios.get(`/api/feedback/meeting/${meeting.id}/status`);
      setFeedbackStatus(data);
      if (data?.myFeedback) {
        setFeedbackRating(data.myFeedback.rating || 0);
        setFeedbackComments(data.myFeedback.comments || '');
      } else {
        setFeedbackRating(0);
        setFeedbackComments('');
      }
    } catch (err) {
      setFeedbackError(err.response?.data?.error || '取得回饋狀態失敗');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const closeFeedbackModal = () => {
    setFeedbackModalOpen(false);
    setFeedbackLoading(false);
    setFeedbackSubmitting(false);
    setFeedbackError('');
    setFeedbackMeeting(null);
    setFeedbackStatus(null);
    setFeedbackRating(0);
    setFeedbackComments('');
  };

  const submitFeedback = async () => {
    if (!feedbackMeeting) return;
    if (!feedbackRating || feedbackRating < 1 || feedbackRating > 5) {
      setFeedbackError('請提供 1-5 的評分');
      return;
    }
    setFeedbackSubmitting(true);
    setFeedbackError('');
    try {
      const payload = {
        rating: Math.round(feedbackRating),
        answers: null,
        comments: feedbackComments?.trim() || null
      };
      const { data } = await axios.post(`/api/feedback/meeting/${feedbackMeeting.id}/submit`, payload);
      setFeedbackStatus({ ...(feedbackStatus || {}), alreadySubmitted: true, myFeedback: data?.feedback || { rating: payload.rating, comments: payload.comments } });
    } catch (err) {
      setFeedbackError(err.response?.data?.error || '提交回饋失敗');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  // 檢查用戶權限
  // 允許所有會員使用會議預約
  // 原先：if (!user || user.membershipLevel > 3) {...}
  if (!user) {
    return (
      <div className="min-h-screen bg-primary-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gold-100 mb-4">請先登入</h2>
          <p className="text-gold-300">登入後即可使用會議預約功能</p>
        </div>
      </div>
    );
  }

  const hasErrors = Object.keys(formErrors).length > 0;

  return (
    <div className="min-h-screen bg-primary-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gold-100">商務面談預約</h1>
          <p className="mt-2 text-gold-300">安排和管理您的商務會議</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-900 border border-red-600 text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-900 border border-green-600 text-green-200 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* 標籤頁 */}
        <div className="bg-primary-800 shadow-lg rounded-lg border border-gold-600">
          <div className="border-b border-gold-600">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`py-3 px-4 border-b-2 font-semibold text-base rounded-t-lg transition-all duration-200 ${
                  activeTab === 'schedule'
                    ? 'border-gold-500 text-gold-100 bg-gold-600 shadow-sm'
                    : 'border-transparent text-gold-300 hover:text-gold-100 hover:border-gold-400 hover:bg-primary-700'
                }`}
              >
                預約會議
              </button>
              <button
                onClick={() => setActiveTab('meetings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'meetings'
                    ? 'border-gold-500 text-gold-100'
                    : 'border-transparent text-gold-300 hover:text-gold-100 hover:border-gold-400'
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
                  <h3 className="text-lg font-medium text-gold-100 mb-4">預約新會議</h3>
                  <form onSubmit={handleCreateMeeting} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gold-300 mb-2">
                        選擇會員
                      </label>
                      <select
                        value={newMeeting.attendee_id}
                        onChange={(e) => handleMemberSelect(e.target.value)}
                        className="w-full px-3 py-2 bg-primary-700 border border-gold-600 rounded-md text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                        required
                      >
                        <option value="">請選擇會員</option>
                        {members.map(member => (
                          <option key={member.id} value={member.id}>
                            {member.name} - {member.company}
                          </option>
                        ))}
                      </select>
                      {formErrors.attendee_id && (
                        <p className="mt-1 text-xs text-red-400">{formErrors.attendee_id}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gold-300 mb-2">
                        會議日期
                      </label>
                      <input
                        type="date"
                        value={newMeeting.meeting_date}
                        onChange={(e) => setNewMeeting({ ...newMeeting, meeting_date: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 bg-primary-700 border border-gold-600 rounded-md text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                        required
                      />
                      {formErrors.meeting_date && (
                        <p className="mt-1 text-xs text-red-400">{formErrors.meeting_date}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gold-300 mb-2">
                          開始時間
                        </label>
                        <input
                          type="time"
                          value={newMeeting.start_time}
                          onChange={(e) => setNewMeeting({ ...newMeeting, start_time: e.target.value })}
                          className="w-full px-3 py-2 bg-primary-700 border border-gold-600 rounded-md text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                          required
                        />
                        {formErrors.start_time && (
                          <p className="mt-1 text-xs text-red-400">{formErrors.start_time}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gold-300 mb-2">
                          結束時間
                        </label>
                        <input
                          type="time"
                          value={newMeeting.end_time}
                          onChange={(e) => setNewMeeting({ ...newMeeting, end_time: e.target.value })}
                          className="w-full px-3 py-2 bg-primary-700 border border-gold-600 rounded-md text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                          required
                        />
                        {formErrors.end_time && (
                          <p className="mt-1 text-xs text-red-400">{formErrors.end_time}</p>
                        )}
                      </div>
                    </div>

                    {/* 時間衝突與其他時間錯誤 */}
                    {(formErrors.time_order || formErrors.time_past || formErrors.time_conflict || formErrors.time_format) && (
                      <div className="bg-yellow-900 border border-yellow-600 text-yellow-200 px-3 py-2 rounded text-sm">
                        {formErrors.time_order || formErrors.time_past || formErrors.time_conflict || formErrors.time_format}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gold-300 mb-2">
                        會議備註
                      </label>
                      <textarea
                        value={newMeeting.notes}
                        onChange={(e) => setNewMeeting({ ...newMeeting, notes: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 bg-primary-700 border border-gold-600 rounded-md text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                        placeholder="請描述會議目的或其他備註..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || hasErrors}
                      className="w-full bg-gradient-to-r from-gold-600 to-gold-700 text-primary-900 py-4 px-6 rounded-lg text-lg font-semibold shadow-lg hover:from-gold-700 hover:to-gold-800 focus:outline-none focus:ring-4 focus:ring-gold-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200"
                    >
                      {loading ? '發送中...' : '預約會議'}
                    </button>
                  </form>
                </div>

                {/* 會員可用時間 */}
                <div>
                  {selectedMember && memberAvailability ? (
                    <div>
                      <h3 className="text-lg font-medium text-gold-100 mb-4">
                        {selectedMember.name} 的日程安排
                      </h3>
                      <div className="bg-primary-700 border border-gold-600 rounded-lg p-4">
                        <p className="text-sm text-gold-300 mb-3">
                          以下是 {selectedMember.name} 未來7天的已確認會議時間：
                        </p>
                        {memberAvailability.busy_times.length === 0 ? (
                          <p className="text-sm text-green-400">該會員未來7天暫無已確認的會議</p>
                        ) : (
                          <div className="space-y-2">
                            {memberAvailability.busy_times.map((busyTime, index) => (
                              <div key={index} className="bg-red-900 text-red-200 px-3 py-2 rounded text-sm">
                                {formatDateTime(busyTime.meeting_time_start)} - {formatDateTime(busyTime.meeting_time_end)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gold-300 py-8">
                      <p>請先選擇會員以查看其日程安排</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 我的會議標籤 */}
            {activeTab === 'meetings' && (
              <div>
                <h3 className="text-lg font-medium text-gold-100 mb-4">我的會議</h3>
                {meetings.length === 0 ? (
                  <p className="text-gold-300 text-center py-8">暫無會議記錄</p>
                ) : (
                  <div className="space-y-4">
                    {meetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        id={`meeting-${meeting.id}`}
                        className={`border ${
                          meeting.id === highlightedMeetingId
                            ? 'border-gold-400 ring-2 ring-gold-500 shadow-lg animate-pulse'
                            : 'border-gold-600'
                        } bg-primary-700 rounded-lg p-4`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-gold-100">
                              與 {meeting.other_party_name} ({meeting.other_party_company}) 的會議
                            </h4>
                            <p className="text-sm text-gold-300">
                              時間：{formatDateTime(meeting.meeting_time_start)} - {formatDateTime(meeting.meeting_time_end)}
                            </p>
                            {/* 回饋摘要 */}
                            {feedbackSummaries[meeting.id] && (
                              <p className="text-sm text-gold-300 mt-1">
                                回饋摘要：我給：{feedbackSummaries[meeting.id].my ?? '—'} 分／對方給：{feedbackSummaries[meeting.id].other ?? '—'} 分
                              </p>
                            )}
                            {meeting.notes && (
                              <p className="text-sm text-gold-200 mb-3">{meeting.notes}</p>
                            )}
                            {meeting.status === 'pending' && (
                              <div className="flex space-x-2">
                                {meeting.meeting_type === 'received' ? (
                                  <>
                                    <button
                                      onClick={() => handleRespondToMeeting(meeting.id, 'confirmed')}
                                      className="bg-gold-600 text-primary-900 px-3 py-1 rounded text-sm hover:bg-gold-700 font-medium"
                                    >
                                      確認
                                    </button>
                                    <button
                                      onClick={() => handleRespondToMeeting(meeting.id, 'cancelled')}
                                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 font-medium"
                                    >
                                      拒絕
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleCancelMeeting(meeting.id)}
                                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 font-medium"
                                  >
                                    取消會議
                                  </button>
                                )}
                              </div>
                            )}
                            {/* 已確認且已結束：顯示回饋按鈕 */}
                            {meeting.status === 'confirmed' && isMeetingEnded(meeting) && (
                              <div className="mt-3">
                                <button
                                  onClick={() => openFeedbackModal(meeting)}
                                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 font-medium"
                                >
                                  填寫/查看回饋
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 會議回饋 Modal */}
            {feedbackModalOpen && (
              <>
                <div className="fixed inset-0 bg-black/50 z-40" onClick={closeFeedbackModal} />
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="w-full max-w-lg bg-primary-700 border border-gold-600 rounded-lg shadow-xl p-5">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-gold-100 text-lg font-semibold">會議回饋</h3>
                      <button onClick={closeFeedbackModal} className="text-gold-300 hover:text-gold-100">×</button>
                    </div>
                    {feedbackMeeting && (
                      <p className="text-sm text-gold-300 mb-3">
                        與 {feedbackMeeting.other_party_name} 的會議：
                        {formatDateTime(feedbackMeeting.meeting_time_start)} - {formatDateTime(feedbackMeeting.meeting_time_end)}
                      </p>
                    )}
                    {feedbackError && (
                      <div className="mb-3 text-red-400 text-sm">{feedbackError}</div>
                    )}
                    {feedbackLoading ? (
                      <div className="text-gold-300">載入中...</div>
                    ) : (
                      <div className="space-y-4">
                        {feedbackStatus && (
                          <div className="text-sm text-gold-300">
                            {feedbackStatus.canSubmit ? (
                              <span className="text-green-400">可提交回饋</span>
                            ) : (
                              <span className="text-yellow-400">目前不可提交回饋（僅能在會議結束後且已確認的會議提交）</span>
                            )}
                            {feedbackStatus.otherFeedback && (
                              <div className="mt-1">對方已提交：評分 {feedbackStatus.otherFeedback.rating} 分</div>
                            )}
                            {feedbackStatus.myFeedback && (
                              <div className="mt-1">我的回饋：評分 {feedbackStatus.myFeedback.rating} 分</div>
                            )}
                          </div>

                        )}
                        <div>
                          <label className="block text-sm text-gold-200 mb-1">評分（1-5）</label>
                            <div className="flex items-center space-x-2">
                            {[1,2,3,4,5].map(n => (
                              <button
                                key={n}
                                onClick={() => setFeedbackRating(n)}
                                className={`w-10 h-10 rounded-full border ${feedbackRating >= n ? 'bg-gold-600 text-primary-900 border-gold-500' : 'bg-primary-800 text-gold-300 border-gold-700'} hover:bg-gold-500 hover:text-primary-900`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm text-gold-200 mb-1">評語（選填）</label>
                          <textarea
                            rows={4}
                            value={feedbackComments}
                            onChange={(e) => setFeedbackComments(e.target.value)}
                            className="w-full bg-primary-800 border border-gold-700 rounded-md p-2 text-gold-100 placeholder-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500"
                            placeholder="可描述本次會議的感受與建議..."
                          />
                        </div>

                        <div className="flex justify-end space-x-2 pt-2">
                          <button
                            onClick={closeFeedbackModal}
                            className="px-4 py-2 rounded-md border border-gold-700 text-gold-200 hover:bg-primary-600"
                            disabled={feedbackSubmitting}
                          >
                            取消
                          </button>
                          <button
                            onClick={submitFeedback}
                            disabled={feedbackSubmitting || (feedbackStatus && !feedbackStatus.canSubmit)}
                            className={`px-4 py-2 rounded-md ${feedbackSubmitting ? 'opacity-60 cursor-not-allowed' : 'bg-gold-600 hover:bg-gold-700 text-primary-900'}`}
                          >
                            {feedbackSubmitting ? '提交中...' : (feedbackStatus?.alreadySubmitted ? '更新回饋' : '提交回饋')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingScheduler;
