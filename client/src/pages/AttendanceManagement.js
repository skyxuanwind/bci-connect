import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const AttendanceManagement = () => {
  const { user, isAdmin } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [attendanceData, setAttendanceData] = useState(null);
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchEvents();
    fetchStatistics();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchAttendanceData(selectedEvent);
    }
  }, [selectedEvent]);

  // 檢查權限 - 僅限核心和管理員
  if (!user || (user.membershipLevel !== 1 && !isAdmin())) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">權限不足</h2>
          <p className="text-gray-600">此功能僅限管理員和核心使用</p>
        </div>
      </div>
    );
  }

  const fetchEvents = async () => {
    try {
      const response = await axios.get('/api/events');
      if (response.data.success) {
        // 按日期排序，最新的在前
        const sortedEvents = response.data.events.sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
        setEvents(sortedEvents);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get('/api/attendance/statistics');
      if (response.data.success) {
        setStatistics(response.data.statistics);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchAttendanceData = async (eventId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/attendance/event/${eventId}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setAttendanceData(data);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('確定要刪除這筆出席記錄嗎？')) {
      return;
    }

    try {
      const response = await fetch(`/api/attendance/record/${recordId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        alert('出席記錄已刪除');
        // 重新載入出席資料
        if (selectedEvent) {
          fetchAttendanceData(selectedEvent);
        }
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('刪除失敗');
    }
  };

  const exportToCSV = () => {
    if (!attendanceData) return;

    const csvData = [];
    csvData.push(['姓名', '公司', '行業', '聯繫電話', '狀態', '報到時間']);

    // 已出席會員
    attendanceData.attendedMembers.forEach(member => {
      csvData.push([
        member.name,
        member.company || '',
        member.industry || '',
        member.contact_number || '',
        '已出席',
        new Date(member.check_in_time).toLocaleString('zh-TW')
      ]);
    });

    // 未出席會員
    attendanceData.absentMembers.forEach(member => {
      csvData.push([
        member.name,
        member.company || '',
        member.industry || '',
        member.contact_number || '',
        '未出席',
        ''
      ]);
    });

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${attendanceData.event.title}_出席名單.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">出席管理</h1>
          <p className="mt-2 text-gray-600">查看和管理活動出席記錄</p>
        </div>

        {/* 標籤切換 */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              統計總覽
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              詳細名單
            </button>
          </nav>
        </div>

        {activeTab === 'overview' && (
          <div>
            {/* 統計卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">總活動數</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">總報名人次</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statistics.reduce((sum, stat) => sum + stat.total_registered, 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">總出席人次</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statistics.reduce((sum, stat) => sum + stat.total_attended, 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">平均出席率</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statistics.length > 0 
                        ? Math.round(statistics.reduce((sum, stat) => sum + parseFloat(stat.attendance_rate), 0) / statistics.length)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 活動統計表格 */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">活動出席統計</h2>
              </div>
              
              {statistics.length === 0 ? (
                <div className="p-8 text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-gray-500">暫無活動統計資料</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">活動名稱</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">活動日期</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">報名人數</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">出席人數</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">出席率</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {statistics.map((stat) => (
                        <tr key={stat.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {stat.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(stat.event_date).toLocaleDateString('zh-TW')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {stat.total_registered}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {stat.total_attended}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              stat.attendance_rate >= 80 ? 'bg-green-100 text-green-800' :
                              stat.attendance_rate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {stat.attendance_rate}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => {
                                setSelectedEvent(stat.id.toString());
                                setActiveTab('details');
                              }}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                            >
                              查看詳情
                            </button>
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

        {activeTab === 'details' && (
          <div>
            {/* 活動選擇 */}
            <div className="bg-white rounded-lg shadow mb-6 p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">選擇活動</label>
                  <select
                    value={selectedEvent}
                    onChange={(e) => setSelectedEvent(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">請選擇活動</option>
                    {events.map(event => (
                      <option key={event.id} value={event.id}>
                        {event.title} - {new Date(event.event_date).toLocaleDateString('zh-TW')}
                      </option>
                    ))}
                  </select>
                </div>
                {attendanceData && (
                  <button
                    onClick={exportToCSV}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    匯出 CSV
                  </button>
                )}
              </div>
            </div>

            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">載入中...</p>
              </div>
            )}

            {attendanceData && !loading && (
              <div>
                {/* 統計摘要 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">總報名人數</p>
                      <p className="text-3xl font-bold text-gray-900">{attendanceData.statistics.totalRegistered}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">已出席</p>
                      <p className="text-3xl font-bold text-green-600">{attendanceData.statistics.totalAttended}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">未出席</p>
                      <p className="text-3xl font-bold text-red-600">{attendanceData.statistics.totalAbsent}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">出席率</p>
                      <p className="text-3xl font-bold text-blue-600">{attendanceData.statistics.attendanceRate}%</p>
                    </div>
                  </div>
                </div>

                {/* 已出席名單 */}
                <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                      已出席會員 ({attendanceData.attendedMembers.length})
                    </h3>
                  </div>
                  
                  {attendanceData.attendedMembers.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-gray-500">暫無出席記錄</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">公司</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">行業</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">聯繫電話</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">報到時間</th>
                            {isAdmin() && (
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {attendanceData.attendedMembers.map((member) => (
                            <tr key={member.user_id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {member.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {member.company || '未提供'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {member.industry || '未提供'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {member.contact_number || '未提供'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(member.check_in_time).toLocaleString('zh-TW')}
                              </td>
                              {isAdmin() && (
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    onClick={() => handleDeleteRecord(member.id)}
                                    className="text-red-600 hover:text-red-900 transition-colors"
                                  >
                                    刪除
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 未出席名單 */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                      未出席會員 ({attendanceData.absentMembers.length})
                    </h3>
                  </div>
                  
                  {attendanceData.absentMembers.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-gray-500">所有報名會員都已出席</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">公司</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">行業</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">聯繫電話</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {attendanceData.absentMembers.map((member) => (
                            <tr key={member.user_id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {member.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {member.company || '未提供'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {member.industry || '未提供'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {member.contact_number || '未提供'}
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
        )}
      </div>
    </div>
  );
};

export default AttendanceManagement;