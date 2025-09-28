import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../config/axios';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay
} from 'date-fns';

function toUTCDateTimeString(date) {
  const d = new Date(date);
  const iso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString();
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function parseLocal(dateString) {
  // 與現有頁面保持一致：移除末尾 Z，避免被當作 UTC
  return new Date(String(dateString || '').replace('Z', ''));
}

const EventsCalendar = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get('/api/events');
        if (data.success) {
          setEvents(data.events || []);
        } else {
          setError(data.message || '獲取活動列表失敗');
        }
      } catch (e) {
        console.error('Error fetching events:', e);
        setError('網路錯誤，請稍後再試');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // 週日開始
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = useMemo(() => {
    const arr = [];
    let day = gridStart;
    while (day <= gridEnd) {
      arr.push(day);
      day = addDays(day, 1);
    }
    return arr;
  }, [gridStart, gridEnd]);

  const eventsByDate = useMemo(() => {
    const map = new Map();
    for (const evt of events) {
      const d = parseLocal(evt.event_date);
      const key = format(d, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(evt);
    }
    return map;
  }, [events]);

  const base = process.env.REACT_APP_API_URL || window.location.origin;
  const icsFeedUrl = `${base}/api/events/calendar.ics`;
  const googleSubscribeUrl = `https://www.google.com/calendar/render?cid=${encodeURIComponent(icsFeedUrl)}`;

  const renderEventItem = (evt) => {
    const d = parseLocal(evt.event_date);
    const timeStr = format(d, 'HH:mm');
    // 事件加入 Google 行事曆 URL（快速建立單一事件）
    const start = toUTCDateTimeString(d);
    const end = toUTCDateTimeString(addDays(d, 0));
    const end2h = toUTCDateTimeString(new Date(d.getTime() + 2 * 60 * 60 * 1000));
    const googleEventUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(evt.title)}&dates=${start}/${end2h}&details=${encodeURIComponent(evt.description || '')}&location=${encodeURIComponent(evt.location || '')}&ctz=Asia/Taipei`;
    return (
      <div key={evt.id} className="mt-1">
        <Link to={`/events/${evt.id}`} className="block text-xs bg-blue-50 hover:bg-blue-100 text-blue-800 px-2 py-1 rounded-md truncate">
          {timeStr} · {evt.title}
        </Link>
        <div className="mt-1 flex gap-2">
          <a href={googleEventUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-600 hover:underline">加入 Google</a>
          <a href={`${base}/api/events/${evt.id}.ics`} className="text-[11px] text-gray-600 hover:underline">下載 .ics</a>
        </div>
      </div>
    );
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">活動月曆</h1>
              <p className="mt-1 text-gray-600">清晰掌握本月活動安排，點擊日期查看當日活動</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={googleSubscribeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Google 訂閱所有活動
              </a>
              <a
                href={icsFeedUrl}
                className="btn-outline"
              >
                下載所有活動 .ics
              </a>
              <Link to="/events" className="btn-light">返回列表視圖</Link>
            </div>
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="btn-light">上個月</button>
          <div className="text-xl font-semibold">{format(currentDate, 'yyyy/MM')}</div>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="btn-light">下個月</button>
        </div>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs sm:text-sm text-gray-600">
          {['日','一','二','三','四','五','六'].map((w) => (
            <div key={w} className="py-2 font-medium">{w}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-7 gap-2">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate.get(key) || [];
            const isCurMonth = isSameMonth(day, monthStart);
            return (
              <div key={key} className={`bg-white rounded-lg shadow-sm p-3 min-h-[120px] ${isCurMonth ? '' : 'opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <div className={`text-sm font-semibold ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-gray-900'}`}>{format(day, 'd')}</div>
                  {isSameDay(day, new Date()) && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">今天</span>
                  )}
                </div>
                <div className="mt-2">
                  {dayEvents.length === 0 ? (
                    <div className="text-xs text-gray-400">無活動</div>
                  ) : (
                    dayEvents.map(renderEventItem)
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-700">{error}</div>
        )}
      </div>
    </div>
  );
};

export default EventsCalendar;