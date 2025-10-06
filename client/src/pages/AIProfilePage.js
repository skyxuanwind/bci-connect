import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import SkeletonBlock from '../components/SkeletonBlock';
import SkeletonList from '../components/SkeletonList';
import { toast } from 'react-hot-toast';
import axios from '../config/axios';
import {
  UserIcon,
  CpuChipIcon,
  ChartBarIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LightBulbIcon,
  BriefcaseIcon,
  UsersIcon,
  TrophyIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

// 固定顯示時區（與後端 date_trunc 對齊）
const DISPLAY_TIME_ZONE = 'Asia/Taipei';

const AIProfilePage = ({ standaloneTab }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const isStandalone = Boolean(standaloneTab);
  const initialTab = isStandalone
    ? standaloneTab
    : (() => {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        const allowedTabs = ['overview', 'personality', 'business', 'collaboration', 'opportunities', 'risks', 'myBusiness'];
        return tabParam && allowedTabs.includes(tabParam) ? tabParam : 'overview';
      })();
  const [activeTab, setActiveTab] = useState(initialTab);
  // 我的商業儀表板狀態
  const [timeRange, setTimeRange] = useState('monthly'); // monthly | semiannual | annual
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [showSourceDetails, setShowSourceDetails] = useState(false);
  const [lastNotifyTime, setLastNotifyTime] = useState(null);
  const [sources, setSources] = useState({ top_sent_partners: [], top_received_partners: [], top_meeting_partners: [] });
  const [sourcesLoading, setSourcesLoading] = useState(false);
  // 目標中心狀態
  const [goalForm, setGoalForm] = useState({
    referrals_sent: 0,
    referrals_received: 0,
    referrals_confirmed: 0,
    exchanges_confirmed: 0
  });
  const [goalLoading, setGoalLoading] = useState(false);
  const [goalSaving, setGoalSaving] = useState(false);
  // 提醒臨界值（達成率低於此值時提醒）
  const [reminderThreshold, setReminderThreshold] = useState(0.5);
  const [thresholdLoading, setThresholdLoading] = useState(false);
  const [thresholdSaving, setThresholdSaving] = useState(false);
  // 建議目標回退
  const [prevGoalBackup, setPrevGoalBackup] = useState(null);
  // 產品／服務管理狀態
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', tags: '', is_active: true });
  const [productSaving, setProductSaving] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  // 搜尋與分頁
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(5);
  // 行銷漏斗配置狀態
  const [funnelConfig, setFunnelConfig] = useState({ stages: [], notes: '' });
  const [funnelLoading, setFunnelLoading] = useState(false);
  const [funnelSaving, setFunnelSaving] = useState(false);
  // 漏斗拖曳排序
  const [draggingStageIndex, setDraggingStageIndex] = useState(null);
  // 相似會員狀態
  const [similarMembers, setSimilarMembers] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarError, setSimilarError] = useState('');
  const [minScore, setMinScore] = useState(70);
  const [limit, setLimit] = useState(8);
  // AI 策略建議
  const [strategy, setStrategy] = useState(null);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategySaving, setStrategySaving] = useState(false);
  const [strategyRating, setStrategyRating] = useState(0);
  const [strategyFeedback, setStrategyFeedback] = useState('');
  const [lastStrategyId, setLastStrategyId] = useState(null);
  // 會議時段偏好
  const [meetingPrefs, setMeetingPrefs] = useState({ preferredDays: [1,2,3,4,5], startHour: 9, endHour: 12, durationMinutes: 30, avoidWeekends: true });
  const [meetingPrefsLoading, setMeetingPrefsLoading] = useState(false);
  const [meetingPrefsSaving, setMeetingPrefsSaving] = useState(false);
  // 引薦稿 Dialog 狀態
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [referralSubject, setReferralSubject] = useState('');
  const [referralMessage, setReferralMessage] = useState('');
  const [referralAmount, setReferralAmount] = useState(0);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [creatingReferral, setCreatingReferral] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchAnalysis();
    fetchSimilarMembers();
    fetchMeetingPrefs();
  }, []);

  // 初始化載入提醒臨界值
  useEffect(() => {
    fetchReminderThreshold();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useMemo：整理週/月圖表資料與達成率，提升渲染效能
  const weeklyChartData = useMemo(() => {
    const trends = dashboardSummary?.trends || {};
    const weekly = trends?.weekly || {};
    const wkLen = Math.max(
      (weekly?.referrals_sent || []).length,
      (weekly?.referrals_received || []).length,
      (weekly?.referrals_confirmed || []).length,
      (weekly?.exchanges_confirmed || []).length,
      0
    );
    return Array.from({ length: wkLen }).map((_, i) => ({
      label: weekly?.referrals_sent?.[i]?.label ?? `#${i + 1}`,
      sent: Number(weekly?.referrals_sent?.[i]?.value || 0),
      received: Number(weekly?.referrals_received?.[i]?.value || 0),
      confirmed: Number(weekly?.referrals_confirmed?.[i]?.value || 0),
      exchanges: Number(weekly?.exchanges_confirmed?.[i]?.value || 0)
    }));
  }, [dashboardSummary]);

  const monthlyChartData = useMemo(() => {
    const trends = dashboardSummary?.trends || {};
    const monthly = trends?.monthly || {};
    const moLen = Math.max(
      (monthly?.referrals_sent || []).length,
      (monthly?.referrals_received || []).length,
      (monthly?.referrals_confirmed || []).length,
      (monthly?.exchanges_confirmed || []).length,
      0
    );
    return Array.from({ length: moLen }).map((_, i) => ({
      label: monthly?.referrals_sent?.[i]?.label ?? `#${i + 1}`,
      sent: Number(monthly?.referrals_sent?.[i]?.value || 0),
      received: Number(monthly?.referrals_received?.[i]?.value || 0),
      confirmed: Number(monthly?.referrals_confirmed?.[i]?.value || 0),
      exchanges: Number(monthly?.exchanges_confirmed?.[i]?.value || 0)
    }));
  }, [dashboardSummary]);

  const achievementRates = useMemo(() => {
    const r = dashboardSummary?.achievementRates || {};
    return {
      referrals_sent: Number(r.referrals_sent ?? 0),
      referrals_received: Number(r.referrals_received ?? 0),
      referrals_confirmed: Number(r.referrals_confirmed ?? 0),
      exchanges_confirmed: Number(r.exchanges_confirmed ?? 0)
    };
  }, [dashboardSummary]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/ai-profiles/me');
      if (response.data.success) {
        setProfile(response.data.data);
      }
    } catch (error) {
      console.error('獲取AI畫像失敗:', error);
      toast.error('獲取AI畫像失敗');
    }
  };

  const fetchAnalysis = async () => {
    try {
      const response = await axios.get('/api/ai-profiles/me/analysis');
      if (response.data.success) {
        const data = response.data.data || {};
        setAnalysis({
          lastAnalyzed: data.lastAnalyzed || null,
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : []
        });
      }
    } catch (error) {
      console.error('獲取分析報告失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  // 取得相似會員
  const fetchSimilarMembers = async () => {
    setSimilarLoading(true);
    setSimilarError('');
    try {
      const resp = await axios.get('/api/ai-profiles/me/similar-members', {
        params: { minScore, limit }
      });
      if (resp.data?.success) {
        const list = resp.data?.data?.similarMembers || [];
        setSimilarMembers(Array.isArray(list) ? list : []);
      } else {
        setSimilarMembers([]);
      }
    } catch (e) {
      console.error('獲取相似會員失敗:', e);
      setSimilarError('無法取得相似會員');
      setSimilarMembers([]);
    } finally {
      setSimilarLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setUpdating(true);
    try {
      const response = await axios.post('/api/ai-profiles/me/update', {
        forceUpdate: true
      });
      if (response.data.success) {
        setProfile(response.data.data);
        toast.success('AI畫像更新成功');
        await fetchAnalysis();
        await fetchSimilarMembers();
      }
    } catch (error) {
      console.error('更新AI畫像失敗:', error);
      toast.error('更新AI畫像失敗');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '尚未更新';
    try {
      const d = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return new Intl.DateTimeFormat('zh-TW', {
        timeZone: DISPLAY_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d);
    } catch {
      return String(dateString);
    }
  };

  // 取得我的商業儀表板統計
  const fetchBusinessDashboardSummary = async (range = timeRange) => {
    setDashboardLoading(true);
    try {
      const resp = await axios.get('/api/business-dashboard/summary', {
        params: { range }
      });
      if (resp.data?.success) {
        setDashboardSummary(resp.data.data);
        const g = resp.data?.data?.goals || {};
        setGoalForm({
          referrals_sent: Number(g.referrals_sent || 0),
          referrals_received: Number(g.referrals_received || 0),
          referrals_confirmed: Number(g.referrals_confirmed || 0),
          exchanges_confirmed: Number(g.exchanges_confirmed || 0)
        });
      } else {
        setDashboardSummary(null);
      }
    } catch (e) {
      console.error('取得商業儀表板統計失敗:', e);
      toast.error('取得儀表板統計失敗');
      setDashboardSummary(null);
    } finally {
      setDashboardLoading(false);
    }
  };

  // 取得來源分解（Top N 合作夥伴與轉換率）
  const sourcesCacheRef = useRef(new Map());
  const fetchSources = async (range = timeRange, { refresh = false } = {}) => {
    setSourcesLoading(true);
    try {
      if (!refresh) {
        const cached = sourcesCacheRef.current.get(range);
        if (cached) {
          setSources(cached);
          return;
        }
      }
      const resp = await axios.get('/api/business-dashboard/sources', { params: { range } });
      if (resp?.data?.success) {
        const data = resp?.data?.data || { top_sent_partners: [], top_received_partners: [], top_meeting_partners: [] };
        setSources(data);
        sourcesCacheRef.current.set(range, data);
      }
    } catch (e) {
      console.error('來源分解載入失敗:', e);
    } finally {
      setSourcesLoading(false);
    }
  };

  // 取得 AI 策略建議
  const fetchStrategyRecommendations = async (range = timeRange) => {
    setStrategyLoading(true);
    try {
      const resp = await axios.get('/api/ai-strategy/recommendations', { params: { range } });
      if (resp.data?.success) {
        setStrategy(resp.data);
      } else {
        setStrategy(null);
      }
    } catch (e) {
      console.error('取得 AI 策略建議失敗:', e);
      setStrategy(null);
    } finally {
      setStrategyLoading(false);
    }
  };

  // 讀取會議時段偏好
  const fetchMeetingPrefs = async () => {
    try {
      setMeetingPrefsLoading(true);
      const resp = await axios.get('/api/users/meeting-time-preferences');
      const prefs = resp?.data?.preferences;
      if (prefs) setMeetingPrefs(prefs);
    } catch (e) {
      console.error('讀取會議時段偏好失敗:', e);
    } finally {
      setMeetingPrefsLoading(false);
    }
  };

  // 保存會議時段偏好
  const saveMeetingPrefs = async () => {
    try {
      setMeetingPrefsSaving(true);
      await axios.put('/api/users/meeting-time-preferences', meetingPrefs);
      toast.success('已更新交流時段偏好');
    } catch (e) {
      console.error('保存會議時段偏好失敗:', e);
      toast.error('保存交流時段偏好失敗');
    } finally {
      setMeetingPrefsSaving(false);
    }
  };

  // 讀取提醒臨界值（users.reminder_threshold）
  const fetchReminderThreshold = async () => {
    try {
      setThresholdLoading(true);
      const resp = await axios.get('/api/users/reminder-threshold');
      const t = Number(resp?.data?.threshold ?? 0.5);
      setReminderThreshold(Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0.5);
    } catch (e) {
      console.error('讀取提醒臨界值失敗:', e);
    } finally {
      setThresholdLoading(false);
    }
  };

  const saveReminderThreshold = async () => {
    try {
      setThresholdSaving(true);
      await axios.put('/api/users/reminder-threshold', { threshold: reminderThreshold });
      toast.success('提醒臨界值已更新');
    } catch (e) {
      console.error('保存提醒臨界值失敗:', e);
      toast.error('保存提醒臨界值失敗');
    } finally {
      setThresholdSaving(false);
    }
  };

  // 保存當前策略建議（持久化）
  const saveStrategyRecommendations = async () => {
    if (!strategy?.ai) {
      toast.error('尚未生成可保存的建議');
      return;
    }
    try {
      setStrategySaving(true);
      const resp = await axios.post('/api/ai-strategy/recommendations/save', {
        range: timeRange,
        recommendations: strategy.ai
      });
      if (resp.data?.success) {
        setLastStrategyId(resp.data?.data?.id || null);
        toast.success('已保存本期 AI 策略建議');
      } else {
        toast.error('保存失敗');
      }
    } catch (e) {
      console.error('保存 AI 策略建議失敗:', e);
      toast.error('保存失敗');
    } finally {
      setStrategySaving(false);
    }
  };

  // 提交對策略建議的評分／回饋
  const submitStrategyFeedback = async () => {
    if (!lastStrategyId) {
      toast.error('請先保存建議後再提交評分');
      return;
    }
    try {
      const resp = await axios.post('/api/ai-strategy/recommendations/feedback', {
        id: lastStrategyId,
        rating: strategyRating,
        feedback: strategyFeedback
      });
      if (resp.data?.success) {
        toast.success('已提交評分與回饋');
        setStrategyFeedback('');
      } else {
        toast.error('提交失敗');
      }
    } catch (e) {
      console.error('提交評分失敗:', e);
      toast.error('提交失敗');
    }
  };

  // 取得當期目標（用於確保表單與後端同步）
  const fetchGoals = async (range = timeRange) => {
    setGoalLoading(true);
    try {
      const resp = await axios.get('/api/business-dashboard/goals', {
        params: { range }
      });
      if (resp.data?.success) {
        const g = resp.data?.data?.targets || {};
        setGoalForm({
          referrals_sent: Number(g.referrals_sent || 0),
          referrals_received: Number(g.referrals_received || 0),
          referrals_confirmed: Number(g.referrals_confirmed || 0),
          exchanges_confirmed: Number(g.exchanges_confirmed || 0)
        });
      }
    } catch (e) {
      console.error('取得目標失敗:', e);
    } finally {
      setGoalLoading(false);
    }
  };

  // 產品／服務：列表載入
  const fetchProductsServices = async () => {
    setProductsLoading(true);
    try {
      const resp = await axios.get('/api/business-dashboard/products-services');
      if (resp.data?.success) {
        setProducts(Array.isArray(resp.data.data) ? resp.data.data : []);
        setProductPage(1); // 載入時重置到第一頁
      } else {
        setProducts([]);
      }
    } catch (e) {
      console.error('取得產品／服務列表失敗:', e);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  const resetProductForm = () => {
    setProductForm({ name: '', description: '', price: '', tags: '', is_active: true });
    setEditingProductId(null);
  };

  const startEditProduct = (item) => {
    setEditingProductId(item.id);
    setProductForm({
      name: item.name || '',
      description: item.description || '',
      price: item.price ?? '',
      tags: Array.isArray(item.tags) ? item.tags.join(',') : (item.tags || ''),
      is_active: Boolean(item.is_active)
    });
  };

  const saveProduct = async () => {
    if (!productForm.name || !productForm.name.trim()) {
      toast.error('請填寫產品／服務名稱');
      return;
    }
    setProductSaving(true);
    try {
      const payload = {
        name: productForm.name.trim(),
        description: productForm.description || null,
        price: productForm.price === '' ? null : Number(productForm.price),
        tags: (productForm.tags || '').split(',').map(t => t.trim()).filter(Boolean),
        is_active: !!productForm.is_active
      };
      let resp;
      if (editingProductId) {
        resp = await axios.put(`/api/business-dashboard/products-services/${editingProductId}`, payload);
      } else {
        resp = await axios.post('/api/business-dashboard/products-services', payload);
      }
      if (resp.data?.success) {
        toast.success(editingProductId ? '項目已更新' : '項目已新增');
        resetProductForm();
        await fetchProductsServices();
      } else {
        toast.error(resp?.data?.error || '儲存失敗');
      }
    } catch (e) {
      console.error('儲存產品／服務失敗:', e);
      toast.error(e?.response?.data?.error || '儲存失敗');
    } finally {
      setProductSaving(false);
    }
  };

  const deleteProduct = async (id) => {
    try {
      const resp = await axios.delete(`/api/business-dashboard/products-services/${id}`);
      if (resp.data?.success) {
        toast.success('已刪除');
        await fetchProductsServices();
      } else {
        toast.error(resp?.data?.error || '刪除失敗');
      }
    } catch (e) {
      console.error('刪除產品／服務失敗:', e);
      toast.error(e?.response?.data?.error || '刪除失敗');
    }
  };

  // 行銷漏斗：載入與儲存
  const fetchFunnel = async () => {
    setFunnelLoading(true);
    try {
      const resp = await axios.get('/api/business-dashboard/funnel');
      if (resp.data?.success) {
        const data = resp.data?.data || {};
        setFunnelConfig({
          stages: Array.isArray(data.stages) ? data.stages : [],
          notes: data.notes || ''
        });
      } else {
        setFunnelConfig({ stages: [], notes: '' });
      }
    } catch (e) {
      console.error('取得漏斗配置失敗:', e);
      setFunnelConfig({ stages: [], notes: '' });
    } finally {
      setFunnelLoading(false);
    }
  };

  const saveFunnel = async () => {
    setFunnelSaving(true);
    try {
      const payload = {
        stages: Array.isArray(funnelConfig.stages) ? funnelConfig.stages.filter(Boolean) : [],
        notes: funnelConfig.notes || ''
      };
      const resp = await axios.post('/api/business-dashboard/funnel', payload);
      if (resp.data?.success) {
        toast.success('漏斗配置已儲存');
        await fetchFunnel();
      } else {
        toast.error(resp?.data?.error || '儲存失敗');
      }
    } catch (e) {
      console.error('儲存漏斗配置失敗:', e);
      toast.error(e?.response?.data?.error || '儲存失敗');
    } finally {
      setFunnelSaving(false);
    }
  };

  const addFunnelStage = () => {
    setFunnelConfig((prev) => ({ ...prev, stages: [...(prev.stages || []), ''] }));
  };

  const updateFunnelStage = (idx, value) => {
    setFunnelConfig((prev) => {
      const stages = [...(prev.stages || [])];
      stages[idx] = value;
      return { ...prev, stages };
    });
  };

  const removeFunnelStage = (idx) => {
    setFunnelConfig((prev) => {
      const stages = [...(prev.stages || [])];
      stages.splice(idx, 1);
      return { ...prev, stages };
    });
  };

  const onStageDragStart = (idx) => {
    setDraggingStageIndex(idx);
  };

  const onStageDragOver = (e, overIdx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onStageDrop = (overIdx) => {
    setFunnelConfig((prev) => {
      const stages = [...(prev.stages || [])];
      const from = draggingStageIndex;
      if (from == null || from === overIdx) return prev;
      const [moved] = stages.splice(from, 1);
      stages.splice(overIdx, 0, moved);
      return { ...prev, stages };
    });
    setDraggingStageIndex(null);
  };

  // 達成率提醒與 AI 建議目標
  const notifyAchievements = async () => {
    try {
      const resp = await axios.post('/api/business-dashboard/achievements/notify', { range: timeRange });
      if (resp.data?.success) {
        setLastNotifyTime(new Date().toISOString());
        toast.success('提醒已發送');
      } else {
        toast.error(resp?.data?.error || '提醒發送失敗');
      }
    } catch (e) {
      console.error('提醒發送失敗:', e);
      toast.error(e?.response?.data?.error || '提醒發送失敗');
    }
  };

  const applySuggestedTargets = async () => {
    const s = dashboardSummary?.suggestedTargets;
    if (!s) {
      toast.error('無建議目標可套用');
      return;
    }
    try {
      setPrevGoalBackup(goalForm);
      const newTargets = {
        referrals_sent: Number(s.referrals_sent || 0),
        referrals_received: Number(s.referrals_received || 0),
        referrals_confirmed: Number(s.referrals_confirmed || 0),
        exchanges_confirmed: Number(s.exchanges_confirmed || 0)
      };
      setGoalForm(newTargets);
      setGoalSaving(true);
      await axios.post('/api/business-dashboard/goals', { range: timeRange, targets: newTargets });
      toast.success('已套用 AI 建議目標');
      await fetchBusinessDashboardSummary(timeRange);
    } catch (e) {
      console.error('套用建議目標失敗:', e);
      toast.error('套用建議目標失敗');
    } finally {
      setGoalSaving(false);
    }
  };

  const revertSuggestedTargets = () => {
    if (!prevGoalBackup) {
      toast.error('無可回退的先前目標');
      return;
    }
    setGoalForm(prevGoalBackup);
    setPrevGoalBackup(null);
    toast.success('已回退到先前目標');
  };

  // 切換分頁到我的商業儀表板時載入統計
  useEffect(() => {
    if (activeTab === 'myBusiness') {
      fetchBusinessDashboardSummary(timeRange);
      fetchGoals(timeRange);
      fetchProductsServices();
      fetchFunnel();
      fetchStrategyRecommendations(timeRange);
      fetchSources(timeRange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // 時間範圍變更時更新統計
  const timeRangeDebounceRef = useRef();
  useEffect(() => {
    if (activeTab !== 'myBusiness') return;
    if (timeRangeDebounceRef.current) {
      clearTimeout(timeRangeDebounceRef.current);
    }
    timeRangeDebounceRef.current = setTimeout(() => {
      fetchBusinessDashboardSummary(timeRange);
      fetchGoals(timeRange);
      fetchProductsServices();
      fetchFunnel();
      fetchStrategyRecommendations(timeRange);
      fetchSources(timeRange);
    }, 400);
    return () => {
      if (timeRangeDebounceRef.current) {
        clearTimeout(timeRangeDebounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const handleGoalInputChange = (key, val) => {
    const num = Number(val);
    setGoalForm((prev) => ({ ...prev, [key]: Number.isFinite(num) && num >= 0 ? num : 0 }));
  };

  const saveGoals = async () => {
    setGoalSaving(true);
    try {
      const resp = await axios.post('/api/business-dashboard/goals', {
        range: timeRange,
        targets: goalForm
      });
      if (resp.data?.success) {
        toast.success('目標已儲存');
        // 重新載入摘要以更新「目標 vs 實績」
        await fetchBusinessDashboardSummary(timeRange);
      } else {
        toast.error(resp?.data?.error || '儲存目標失敗');
      }
    } catch (e) {
      console.error('儲存目標失敗:', e);
      toast.error(e?.response?.data?.error || '儲存目標失敗');
    } finally {
      setGoalSaving(false);
    }
  };

  const getCompletenessColor = (completeness) => {
    if (completeness >= 80) return 'text-green-600';
    if (completeness >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCompletenessBarColor = (completeness) => {
    if (completeness >= 80) return 'bg-green-500';
    if (completeness >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // 方便渲染的快捷存取
  const aiInsights = profile?.profile?.ai_insights || {};
  const commStyle = aiInsights?.communication_style || profile?.profile?.conversational_data?.communication_style || {};
  const mbtiSummary = aiInsights?.mbti_summary || '';
  // 開啟引薦稿對話框並一鍵生成草稿
  const openReferralDialog = async (member) => {
    setSelectedMember(member);
    setReferralDialogOpen(true);
    setReferralSubject('');
    setReferralMessage('');
    setReferralAmount(0);
    await generateReferralDraft(member);
  };

  const closeReferralDialog = () => {
    setReferralDialogOpen(false);
    setSelectedMember(null);
    setReferralSubject('');
    setReferralMessage('');
    setReferralAmount(0);
    setGeneratingDraft(false);
    setCreatingReferral(false);
  };

  const generateReferralDraft = async (member) => {
    try {
      setGeneratingDraft(true);
      const payload = {
        name: member?.name || '',
        company: member?.company || '',
        title: member?.title || '',
        email: member?.email || '',
        phone: member?.contact_number || member?.phone || '',
        tags: Array.isArray(member?.skills) ? member.skills : [],
        notes: '',
        last_interaction: '',
        goal: '請產生一段用於向該會員自我介紹並建立引薦合作的訊息草稿',
        channelPreference: member?.email ? 'email' : ''
      };
      const resp = await axios.post('/api/ai/contacts/followup-suggestion', payload);
      const data = resp?.data?.data || {};
      const draft = data?.draft || {};
      if (draft?.subject) setReferralSubject(draft.subject);
      if (draft?.message) setReferralMessage(draft.message);
      if (!draft?.message) {
        setReferralMessage(`您好${member?.name ? '，' + member.name : ''}：\n\n我在 GBC 商務菁英會上看見您（${member?.company || ''}${member?.title ? '／' + member.title : ''}），覺得彼此背景可互補，期待先相互認識並探索可行合作或轉介機會。若您方便，想安排一個 20 分鐘的線上交流，時間可由您指定。\n\n謝謝，期待您的回覆！`);
      }
    } catch (e) {
      console.warn('AI 生成引薦稿失敗，使用備援文案:', e?.message);
      setReferralMessage(`您好${member?.name ? '，' + member.name : ''}：\n\n我在 GBC 商務菁英會上看見您（${member?.company || ''}${member?.title ? '／' + member.title : ''}），覺得彼此背景可互補，期待先相互認識並探索可行合作或轉介機會。若您方便，想安排一個 20 分鐘的線上交流，時間可由您指定。\n\n謝謝，期待您的回覆！`);
    } finally {
      setGeneratingDraft(false);
    }
  };

  const submitReferral = async () => {
    if (!selectedMember) return;
    if (!referralMessage || referralMessage.trim().length < 10) {
      toast.error('請先確認引薦稿內容');
      return;
    }
    try {
      setCreatingReferral(true);
      const payload = {
        referred_to_id: selectedMember.id,
        referral_amount: Number.isFinite(Number(referralAmount)) ? Number(referralAmount) : 0,
        description: referralMessage
      };
      const resp = await axios.post('/api/referrals/create', payload);
      if (resp.status === 201) {
        toast.success('引薦已發送');
        closeReferralDialog();
      } else {
        toast.error(resp?.data?.error || '引薦發送失敗');
      }
    } catch (e) {
      console.error('建立引薦失敗:', e);
      toast.error(e?.response?.data?.error || '建立引薦失敗');
    } finally {
      setCreatingReferral(false);
    }
  };

  // 一鍵安排交流：預設三天後上午 10:00，時長 30 分鐘；避開週末並盡量使用可用時段
  const quickScheduleMeeting = async (member) => {
    try {
      if (!member?.id) {
        toast.error('無效的目標會員');
        return;
      }

      // 預設：三天後 10:00
      let start = new Date();
      start.setDate(start.getDate() + 3);
      // 若落在週末則推到下週一
      const day = start.getDay(); // 0:Sun, 6:Sat
      if (day === 6) start.setDate(start.getDate() + 2); // 週六 -> 週一
      else if (day === 0) start.setDate(start.getDate() + 1); // 週日 -> 週一
      start.setHours(10, 0, 0, 0);

      // 嘗試查詢對方未來兩週的可用時段，優先選擇符合我的偏好
      try {
        const rangeStart = new Date();
        rangeStart.setDate(rangeStart.getDate() + 1);
        const rangeEnd = new Date(rangeStart);
        rangeEnd.setDate(rangeEnd.getDate() + 14);

        const availResp = await axios.get(`/api/meetings/availability/${member.id}`, {
          params: { start_date: rangeStart.toISOString(), end_date: rangeEnd.toISOString() }
        });
        const busy = Array.isArray(availResp?.data?.busy_times) ? availResp.data.busy_times : [];
        const candidates = [];
        const preferredDays = Array.isArray(meetingPrefs?.preferredDays) ? meetingPrefs.preferredDays : [1,2,3,4,5];
        const sh = Number(meetingPrefs?.startHour || 9);
        const eh = Number(meetingPrefs?.endHour || 12);
        const dur = Number(meetingPrefs?.durationMinutes || 30);
        for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
          const dow = d.getDay(); // 0-6
          const isoDow = dow === 0 ? 7 : dow; // 將週日當 7，週一為 1
          if (meetingPrefs?.avoidWeekends && (dow === 0 || dow === 6)) continue;
          if (!preferredDays.includes(isoDow)) continue;
          for (let h = sh; h <= eh - Math.ceil(dur / 60); h++) {
            const candidateStart = new Date(d);
            candidateStart.setHours(h, 0, 0, 0);
            const candidateEnd = new Date(candidateStart);
            candidateEnd.setMinutes(candidateEnd.getMinutes() + dur);
            const overlap = busy.some((b) => {
              const bs = new Date(b.meeting_time_start);
              const be = new Date(b.meeting_time_end);
              return !(candidateEnd <= bs || candidateStart >= be);
            });
            if (!overlap && candidateStart > new Date()) {
              candidates.push({ start: new Date(candidateStart), end: new Date(candidateEnd) });
              if (candidates.length >= 1) break;
            }
          }
          if (candidates.length >= 1) break;
        }
        if (candidates.length > 0) {
          start = candidates[0].start;
          const end = candidates[0].end;
          const resp = await axios.post('/api/meetings/create', {
            attendee_id: member.id,
            meeting_time_start: start.toISOString(),
            meeting_time_end: end.toISOString(),
            notes: `一鍵交流（依偏好）｜${user?.name || '我'} → ${member?.name || ''}`
          });
          if (resp?.data?.meeting) {
            toast.success('已發送交流邀請（偏好時段）');
            return;
          }
        }
      } catch (availErr) {
        // 可用時段查詢失敗則使用預設
        console.warn('查詢會員可用時段失敗，使用預設時間', availErr?.message);
      }

      const end = new Date(start.getTime() + 30 * 60 * 1000);

      const payload = {
        attendee_id: member.id,
        meeting_time_start: start.toISOString(),
        meeting_time_end: end.toISOString(),
        notes: `AI 一鍵安排交流：與 ${member?.name || '會員'} 初次認識與合作探索`
      };
      const resp = await axios.post('/api/meetings/create', payload);
      if (resp?.data) {
        toast.success('已建立交流邀請');
      } else {
        toast.error('建立交流失敗');
      }
    } catch (e) {
      console.error('一鍵安排交流失敗:', e);
      const msg = e?.response?.data?.error || e?.message || '建立交流失敗';
      toast.error(msg);
    }
  };

  // 一鍵採用本週行動：將 quick_actions 映射為批次引薦與交流
  const adoptWeeklyActions = async () => {
    try {
      const actions = strategy?.ai?.quick_actions || [];
      if (!actions.length) {
        toast.error('本週行動為空');
        return;
      }
      let referralCount = 0;
      let meetingCount = 0;
      const topCandidates = (similarMembers || []).filter(m => m?.id !== user?.id).sort((a,b) => (b?.score||0) - (a?.score||0));

      for (const a of actions) {
        const text = typeof a === 'string' ? a : (a?.action || '');
        const nMatch = text.match(/(\d+)/);
        const times = nMatch ? Math.max(1, parseInt(nMatch[1], 10)) : 1;
        const isReferral = /引薦|推薦|referral/i.test(text);
        const isMeeting = /交流|meeting|約談|會面/i.test(text);
        for (let i = 0; i < times; i++) {
          const target = topCandidates[(referralCount + meetingCount + i) % Math.max(1, topCandidates.length)];
          if (!target) break;
          if (isReferral) {
            try {
              await generateReferralDraft(target);
              await axios.post('/api/referrals/create', {
                referred_to_id: target.id,
                referral_amount: 1,
                description: referralMessage || `一鍵引薦：${user?.name || ''} → ${target?.name || ''}`,
                subject: referralSubject || '一鍵引薦草稿'
              });
              referralCount++;
            } catch (e) {
              console.warn('批次引薦失敗：', e?.response?.data || e.message);
            }
          } else if (isMeeting) {
            try {
              await quickScheduleMeeting(target);
              meetingCount++;
            } catch (e) {
              console.warn('批次交流失敗：', e?.response?.data || e.message);
            }
          }
        }
      }
      if (referralCount || meetingCount) {
        toast.success(`已採用本週行動：引薦 ${referralCount}、交流 ${meetingCount}`);
      } else {
        toast.info('無可執行的本週行動或目標不足');
      }
    } catch (e) {
      console.error('一鍵採用本週行動錯誤：', e);
      toast.error('一鍵採用本週行動失敗');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 頁面標題 */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            {/* 改為黑金主題色 */}
            <CpuChipIcon className="h-8 w-8 text-yellow-400" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">AI 深度畫像</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">智能分析您的商業特質與合作潛力</p>
            </div>
          </div>
          <button
            onClick={handleUpdateProfile}
            disabled={updating}
            className="btn-gold inline-flex items-center justify-center w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updating ? (
              <>
                <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                更新中...
              </>
            ) : (
              <>
                <ArrowPathIcon className="-ml-1 mr-2 h-4 w-4" />
                更新畫像
              </>
            )}
          </button>
        </div>
      </div>

      {/* 畫像概覽卡片 */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">畫像概覽</h2>
          <div className="text-right text-sm text-gray-500">
            <div>最後更新: {formatDate(profile?.lastUpdated)}</div>
            {analysis?.lastAnalyzed && (
              <div>最後AI分析: {formatDate(analysis.lastAnalyzed)}</div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 完整度 */}
          <div className="text-center">
            <div className="mb-2">
              <span className={`text-2xl font-bold ${getCompletenessColor(profile?.profileCompleteness || 0)}`}>
                {profile?.profileCompleteness || 0}%
              </span>
            </div>
            <div className="w-full bg-yellow-900/30 rounded-full h-2 mb-2">
              <div 
                className={`h-2 rounded-full ${getCompletenessBarColor(profile?.profileCompleteness || 0)}`}
                style={{ width: `${profile?.profileCompleteness || 0}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">畫像完整度</p>
          </div>

          {/* 數據來源 */}
          <div className="text-center">
            <div className="mb-2">
              <ChartBarIcon className="h-8 w-8 text-yellow-400 mx-auto" />
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {(Object.values(profile?.profile?.data_sources || {}).filter(src => src && src.last_update).length) || 0} 個
            </p>
            <p className="text-sm text-gray-600">數據來源</p>
          </div>

          {/* 分析維度 */}
          <div className="text-center">
            <div className="mb-2">
              <BriefcaseIcon className="h-8 w-8 text-yellow-400 mx-auto" />
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {profile?.profile?.ai_insights?.personality_traits?.length || 0} 項
            </p>
            <p className="text-sm text-gray-600">個性特質</p>
          </div>
        </div>

        {/* 資料來源詳情展開面板 */}
        <div className="mt-4 border-t pt-4">
          <button
            type="button"
            onClick={() => setShowSourceDetails((v) => !v)}
            className="w-full flex items-center justify-between text-left text-sm font-medium text-yellow-300 hover:text-yellow-200"
          >
            <span>資料來源詳情</span>
            {showSourceDetails ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )}
          </button>

          {showSourceDetails && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 靜態資料 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">靜態資料</div>
                <div className="mt-2 text-gray-900">最後更新：{formatDate(profile?.profile?.data_sources?.static?.last_update)}</div>
                <div className="mt-1 text-sm">
                  <span className="text-gray-600">信心度：</span>
                  <span
                    className={`${(profile?.profile?.data_sources?.static?.confidence || 0) >= 80
                      ? 'text-green-600'
                      : (profile?.profile?.data_sources?.static?.confidence || 0) >= 50
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    } font-medium`}
                  >
                    {(profile?.profile?.data_sources?.static?.confidence ?? 0)}%
                  </span>
                </div>
              </div>

              {/* 行為資料 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">行為資料</div>
                <div className="mt-2 text-gray-900">最後更新：{formatDate(profile?.profile?.data_sources?.behavioral?.last_update)}</div>
                <div className="mt-1 text-sm">
                  <span className="text-gray-600">信心度：</span>
                  <span
                    className={`${(profile?.profile?.data_sources?.behavioral?.confidence || 0) >= 80
                      ? 'text-green-600'
                      : (profile?.profile?.data_sources?.behavioral?.confidence || 0) >= 50
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    } font-medium`}
                  >
                    {(profile?.profile?.data_sources?.behavioral?.confidence ?? 0)}%
                  </span>
                </div>
              </div>

              {/* 對話資料 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">對話資料</div>
                <div className="mt-2 text-gray-900">最後更新：{formatDate(profile?.profile?.data_sources?.conversational?.last_update)}</div>
                <div className="mt-1 text-sm">
                  <span className="text-gray-600">信心度：</span>
                  <span
                    className={`${(profile?.profile?.data_sources?.conversational?.confidence || 0) >= 80
                      ? 'text-green-600'
                      : (profile?.profile?.data_sources?.conversational?.confidence || 0) >= 50
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    } font-medium`}
                  >
                    {(profile?.profile?.data_sources?.conversational?.confidence ?? 0)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI 建議（顯著展示於概覽卡片下方） */}
      {analysis?.suggestions?.length > 0 && (
        <div className="bg-gradient-to-br from-black/85 to-gray-900/85 border border-yellow-500/30 rounded-lg shadow-sm p-5 mb-8">
          <div className="flex items-center mb-3">
            <LightBulbIcon className="h-5 w-5 text-yellow-400 mr-2" />
            <h3 className="text-base font-semibold text-gold-100">AI 建議</h3>
            {analysis.lastAnalyzed && (
              <span className="ml-auto text-xs text-gray-500">分析時間：{formatDate(analysis.lastAnalyzed)}</span>
            )}
          </div>
          <ul className="space-y-2">
            {analysis.suggestions.map((s, idx) => (
              <li key={idx} className="flex flex-col sm:flex-row sm:items-start gap-2">
                <span
                  className={`mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.priority === 'high' ? 'bg-red-500/10 text-red-300 border border-red-500/30' : s.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30' : 'bg-green-500/10 text-green-300 border border-green-500/30'}`}
                >
                  {s.priority === 'high' ? '高' : s.priority === 'medium' ? '中' : '低'}
                </span>
                <p className="text-gray-800 flex-1">{s.message}</p>
                {/* 行動按鈕 */}
                <div className="mt-2 sm:mt-0 sm:ml-auto flex flex-col sm:flex-row gap-2">
                  {/* 依建議類型顯示對應行動 */}
                  {(() => {
                    switch (s.type) {
                      case 'profile_completion':
                        return (
                          <>
                            <a href="/profile" className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 whitespace-nowrap">前往個人檔案</a>
                            <button onClick={handleUpdateProfile} className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-medium border border-primary-300 text-primary-700 hover:bg-primary-50 whitespace-nowrap">更新畫像</button>
                          </>
                        );
                      case 'skills_enhancement':
                        return (
                          <>
                            <a href="/events" className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 whitespace-nowrap">參與活動</a>
                            <a href="/referrals" className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-medium border border-blue-300 text-blue-700 hover:bg-blue-50 whitespace-nowrap">啟動轉介</a>
                          </>
                        );
                      case 'engagement_improvement':
                        return (
                          <>
                            <a href="/events" className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 whitespace-nowrap">參與活動</a>
                            <a href="/referrals" className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-medium border border-blue-300 text-blue-700 hover:bg-blue-50 whitespace-nowrap">啟動轉介</a>
                          </>
                        );
                      case 'collaboration_openness':
                        return (
                          <>
                            <a href="/meetings" className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-medium text-white bg-green-600 hover:bg-green-700 whitespace-nowrap">安排交流</a>
                            <a href="/referrals" className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-medium border border-green-300 text-green-700 hover:bg-green-50 whitespace-nowrap">轉介系統</a>
                          </>
                        );
                      default:
                        return (
                          <a href="/referrals" className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 whitespace-nowrap">探索合作機會</a>
                        );
                    }
                  })()}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 相似會員推薦 */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">相似會員推薦</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span>最低分數</span>
              <input type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(parseInt(e.target.value || '0'))} className="w-16 px-2 py-1 border rounded" />
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span>數量</span>
              <input type="number" min={1} max={20} value={limit} onChange={(e) => setLimit(parseInt(e.target.value || '1'))} className="w-16 px-2 py-1 border rounded" />
            </div>
            <button onClick={fetchSimilarMembers} disabled={similarLoading} className="btn-gold px-3 py-1 disabled:opacity-50">
              {similarLoading ? '載入中...' : '刷新結果'}
            </button>
          </div>
        </div>
        {similarError && (
          <div className="text-red-600 text-sm mb-3">{similarError}</div>
        )}
        {similarLoading ? (
          <div className="flex justify-center items-center h-24"><LoadingSpinner /></div>
        ) : similarMembers.length === 0 ? (
          <div className="text-gray-500 text-sm">尚無推薦結果，請嘗試降低分數門檻或更新畫像。</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {similarMembers.map((m, idx) => {
              const mm = m?.member || m; // 後端可能返回 { member, score, reasons }
              const score = m?.score ?? m?.matchingScore ?? 0;
              const reasons = Array.isArray(m?.reasons) ? m.reasons : [];
              return (
                <div key={idx} className="border rounded-lg p-4 bg-black/40 border-yellow-500/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-yellow-300 font-semibold">{mm?.name || '未命名會員'}</div>
                      <div className="text-sm text-gray-300">{[mm?.company, mm?.title].filter(Boolean).join(' / ')}</div>
                    </div>
                    <div className={`text-sm font-bold ${score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-300' : 'text-orange-300'}`}>{Math.round(score)} 分</div>
                  </div>
                  {reasons.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm text-gray-200 list-disc pl-5">
                      {reasons.slice(0, 3).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-4 flex items-center gap-2">
                    <a href={`/members/${mm?.id}`} className="px-3 py-1 rounded-md text-xs font-medium border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10">查看詳情</a>
                    <button onClick={() => openReferralDialog(mm)} className="btn-gold px-3 py-1 text-xs">一鍵生成引薦稿</button>
                    <button onClick={() => quickScheduleMeeting(mm)} className="px-3 py-1 text-xs rounded-md bg-gray-800 text-white hover:bg-gray-900">一鍵安排交流</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 使用說明：如何提升完整度與使用 AI 智慧合作網絡 */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-3">如何提升畫像完整度</h3>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>
            完善個人資料（公司、職稱、產業、專長等）。
            <a href="/profile" className="ml-2 text-primary-600 hover:underline">前往個人檔案</a>
          </li>
          <li>在個人檔案頁填寫「面談表單」，讓 AI 更了解你的背景與目標。</li>
          <li>
            增加平台互動數據：
            <a href="/events" className="ml-1 text-primary-600 hover:underline">參與活動</a>、
            <a href="/wishes" className="ml-1 text-primary-600 hover:underline">發布許願</a> 等。
          </li>
          <li>完成交流並同意生成交流摘要，有助於豐富「對話資料」。</li>
          <li>點擊上方「更新畫像」，以最新資料重新進行 AI 分析。</li>
        </ul>

        <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">如何使用 AI商業版圖</h3>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>
            透過「轉介系統」接收個人化合作建議與媒合提示。
            <a href="/referrals" className="ml-2 text-primary-600 hover:underline">前往轉介</a>
          </li>
          <li>
            使用「轉介系統」與「交流排程」快速建立合作：
            <a href="/referrals" className="ml-2 text-primary-600 hover:underline">轉介系統</a>
            <span className="mx-1">/</span>
            <a href="/meetings" className="text-primary-600 hover:underline">交流排程</a>
          </li>
          <li>
            追蹤「活動列表」以不漏接最新交流與合作機會。
            <a href="/events" className="ml-2 text-primary-600 hover:underline">活動列表</a>
          </li>
        </ul>
      </div>

      {/* 標籤頁導航 */}
      {!isStandalone && (
      <div className="border-b border-yellow-500/30 mb-6">
        <nav className="-mb-px flex overflow-x-auto space-x-4 sm:space-x-8 scrollbar-hide">
          {[
            { id: 'overview', name: '總覽', icon: ChartBarIcon },
            { id: 'personality', name: '個性分析', icon: UserIcon },
            { id: 'business', name: '商業相容性', icon: BriefcaseIcon },
            { id: 'collaboration', name: '合作潛力', icon: UsersIcon },
            { id: 'opportunities', name: '市場機會', icon: LightBulbIcon },
            { id: 'risks', name: '風險評估', icon: ExclamationTriangleIcon },
            { id: 'myBusiness', name: '我的商業儀表板', icon: ChartBarIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-yellow-500/60 text-yellow-300'
                  : 'border-transparent text-gray-400 hover:text-yellow-300 hover:border-yellow-500/30'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center space-x-1 sm:space-x-2 flex-shrink-0`}
            >
              <tab.icon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{tab.name}</span>
              <span className="sm:hidden">{tab.name.length > 4 ? tab.name.substring(0, 4) : tab.name}</span>
            </button>
          ))}
        </nav>
      </div>
      )}

      {/* 標籤頁內容 */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 基本資訊 */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">基本資訊</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">姓名:</span>
                  <span className="font-medium">{user?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">公司:</span>
                  <span className="font-medium">{user?.company}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">產業:</span>
                  <span className="font-medium">{user?.industry}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">職位:</span>
                  <span className="font-medium">{user?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">MBTI:</span>
                  <span className="font-medium">
                    {user?.mbtiPublic ? (user?.mbti || '未填寫') : '未公開'}
                  </span>
                </div>
              </div>
            </div>

            {/* 畫像狀態 */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">畫像狀態</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">靜態資料:</span>
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">行為資料:</span>
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">對話資料:</span>
                  <ClockIcon className="h-5 w-5 text-yellow-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">AI 分析:</span>
                  {analysis ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  ) : (
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'personality' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">個性特質分析</h3>
            {/* MBTI 與摘要 */}
            <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-black/40 border border-yellow-500/30 rounded-lg p-4">
                <div className="text-sm text-gray-300 mb-1">MBTI</div>
                <div className="text-2xl font-extrabold text-yellow-300 tracking-wider">
                  {user?.mbtiPublic ? (user?.mbti || '未填寫') : '未公開'}
                </div>
              </div>
              <div className="lg:col-span-2 bg-black/40 border border-yellow-500/30 rounded-lg p-4">
                <div className="text-sm text-gray-300 mb-1">MBTI 商務互動摘要</div>
                <p className="text-yellow-100 whitespace-pre-wrap">{mbtiSummary || '尚無摘要，請於個人檔案填寫 MBTI 並點擊「更新畫像」生成分析。'}</p>
              </div>
            </div>

            {/* 溝通風格建議 */}
            {(commStyle && (commStyle.tone || commStyle.dos || commStyle.donts || commStyle.meeting || commStyle.negotiation || commStyle.email)) && (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {commStyle.tone && (
                  <div className="bg-black/40 border border-yellow-500/30 rounded-lg p-4">
                    <div className="font-semibold text-yellow-300 mb-1">溝通語氣</div>
                    <p className="text-yellow-100 text-sm whitespace-pre-wrap">{commStyle.tone}</p>
                  </div>
                )}
                {commStyle.email && (
                  <div className="bg-black/40 border border-yellow-500/30 rounded-lg p-4">
                    <div className="font-semibold text-yellow-300 mb-1">Email 建議</div>
                    <p className="text-yellow-100 text-sm whitespace-pre-wrap">{Array.isArray(commStyle.email) ? commStyle.email.join('；') : commStyle.email}</p>
                  </div>
                )}
                {commStyle.meeting && (
                  <div className="bg-black/40 border border-yellow-500/30 rounded-lg p-4">
                    <div className="font-semibold text-yellow-300 mb-1">會議互動</div>
                    <p className="text-yellow-100 text-sm whitespace-pre-wrap">{Array.isArray(commStyle.meeting) ? commStyle.meeting.join('；') : commStyle.meeting}</p>
                  </div>
                )}
                {commStyle.negotiation && (
                  <div className="bg-black/40 border border-yellow-500/30 rounded-lg p-4">
                    <div className="font-semibold text-yellow-300 mb-1">談判要點</div>
                    <p className="text-yellow-100 text-sm whitespace-pre-wrap">{Array.isArray(commStyle.negotiation) ? commStyle.negotiation.join('；') : commStyle.negotiation}</p>
                  </div>
                )}
                {commStyle.dos && (
                  <div className="bg-black/40 border border-green-500/30 rounded-lg p-4">
                    <div className="font-semibold text-green-300 mb-1">建議這樣做</div>
                    <ul className="list-disc pl-5 text-green-100 text-sm space-y-1">
                      {Array.isArray(commStyle.dos) ? commStyle.dos.map((d, i) => (<li key={i}>{d}</li>)) : <li>{commStyle.dos}</li>}
                    </ul>
                  </div>
                )}
                {commStyle.donts && (
                  <div className="bg-black/40 border border-red-500/30 rounded-lg p-4">
                    <div className="font-semibold text-red-300 mb-1">避免這樣做</div>
                    <ul className="list-disc pl-5 text-red-100 text-sm space-y-1">
                      {Array.isArray(commStyle.donts) ? commStyle.donts.map((d, i) => (<li key={i}>{d}</li>)) : <li>{commStyle.donts}</li>}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(profile?.profile?.ai_insights?.personality_traits || []).map((trait, index) => (
                <div key={index} className="bg-black/40 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrophyIcon className="h-5 w-5 text-yellow-400" />
                    <span className="font-medium text-yellow-300">{trait}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'myBusiness' && (
          <div className="space-y-6">
            {/* 時間篩選器 */}
            <div className="bg-white shadow rounded-lg p-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">我的商業儀表板</h3>
                <p className="text-sm text-gray-600">回顧引薦與業務交流的關鍵指標</p>
              </div>
              <div className="flex items-center gap-2">
                {[
                  { id: 'monthly', label: '月度' },
                  { id: 'semiannual', label: '半年度' },
                  { id: 'annual', label: '年度' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setTimeRange(opt.id)}
                    className={`px-3 py-1 rounded-md text-sm border ${
                      timeRange === opt.id
                        ? 'bg-yellow-500 text-white border-yellow-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* AI 策略建議（精準對象／引薦策略／平台技巧／本週行動） */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-md font-medium text-gray-900">AI 策略建議</h4>
                <div className="flex items-center gap-2">
                  {strategyLoading && <span className="text-xs text-gray-500">生成中...</span>}
                  <button
                    onClick={fetchStrategyRecommendations}
                    className="px-2 py-1 rounded text-xs bg-gray-200 text-gray-900 hover:bg-gray-300"
                  >重新生成</button>
                  <button
                    onClick={saveStrategyRecommendations}
                    disabled={strategySaving}
                    className="px-2 py-1 rounded text-xs bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50"
                  >{strategySaving ? '保存中...' : '保存本期建議'}</button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">依目標落差、產品／服務與漏斗階段產生的個人化行動建議。</p>
              {strategy && strategy.ai ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 精準交流對象 */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-800 mb-2">精準交流對象</h5>
                    <ul className="list-disc pl-5 space-y-1 text-gray-700 text-sm">
                      {(strategy.ai.precise_targets || []).map((t, i) => (
                        <li key={i}>
                          {t?.industry ? `[${t.industry}] ` : ''}
                          {t?.role ? `${t.role} ` : ''}
                          {t?.source ? `｜來源：${t.source} ` : ''}
                          {t?.reason ? `｜理由：${t.reason}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* 引薦策略 */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-800 mb-2">引薦策略</h5>
                    <ul className="list-disc pl-5 space-y-1 text-gray-700 text-sm">
                      {(strategy.ai.referral_strategies || []).map((s, i) => (
                        <li key={i}>{typeof s === 'string' ? s : (s?.step || s?.description || '')}</li>
                      ))}
                    </ul>
                  </div>
                  {/* 平台功能技巧 */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-800 mb-2">平台功能運用建議</h5>
                    <ul className="list-disc pl-5 space-y-1 text-gray-700 text-sm">
                      {(strategy.ai.platform_tips || []).map((p, i) => (
                        <li key={i}>{typeof p === 'string' ? p : (p?.tip || p?.description || '')}</li>
                      ))}
                    </ul>
                  </div>
                  {/* 本週行動 */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-800 mb-2">本週行動</h5>
                    <ul className="list-disc pl-5 space-y-1 text-gray-700 text-sm">
                      {(strategy.ai.quick_actions || []).map((a, i) => (
                        <li key={i}>{typeof a === 'string' ? a : `${a?.action || ''}${a?.target ? `（目標：${a.target}）` : ''}`}</li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-2 mt-3">
                      <a href="/referrals" className="px-3 py-2 rounded-md text-sm bg-primary-600 text-white hover:bg-primary-700">前往轉介</a>
                      <a href="/meetings" className="px-3 py-2 rounded-md text-sm bg-gray-800 text-white hover:bg-gray-900">安排交流</a>
                      <a href="/nfc-cards" className="px-3 py-2 rounded-md text-sm bg-gray-200 text-gray-900 hover:bg-gray-300">優化名片</a>
                      <button onClick={adoptWeeklyActions} className="px-3 py-2 rounded-md text-sm bg-yellow-500 text-white hover:bg-yellow-600">一鍵採用本週行動</button>
                    </div>
                    {/* 評分與回饋 */}
                    <div className="mt-4 p-3 border rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-600">本期建議評分</span>
                        <select
                          value={strategyRating}
                          onChange={(e) => setStrategyRating(parseInt(e.target.value || '0', 10))}
                          className="text-xs px-2 py-1 border rounded"
                        >
                          <option value={0}>未評分</option>
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                          <option value={4}>4</option>
                          <option value={5}>5</option>
                        </select>
                        <button onClick={submitStrategyFeedback} className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">送出評分</button>
                      </div>
                      <textarea
                        rows={3}
                        value={strategyFeedback}
                        onChange={(e) => setStrategyFeedback(e.target.value)}
                        placeholder="可選填：此建議對你的幫助、需改進之處...（送出前請先保存本期建議）"
                        className="w-full text-sm px-2 py-1 border rounded"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">暫無建議，或生成中。</div>
              )}
            </div>

            {/* 目標中心 */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">目標中心（{timeRange === 'monthly' ? '月度' : timeRange === 'semiannual' ? '半年度' : '年度'}）</h4>
                <button
                  onClick={saveGoals}
                  disabled={goalSaving}
                  className="px-3 py-2 rounded-md text-sm bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50"
                >
                  {goalSaving ? '儲存中…' : '儲存目標'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">發出引薦目標</label>
                  <input
                    type="number"
                    min="0"
                    value={goalForm.referrals_sent}
                    onChange={(e) => handleGoalInputChange('referrals_sent', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">收到引薦目標</label>
                  <input
                    type="number"
                    min="0"
                    value={goalForm.referrals_received}
                    onChange={(e) => handleGoalInputChange('referrals_received', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">確認引薦目標</label>
                  <input
                    type="number"
                    min="0"
                    value={goalForm.referrals_confirmed}
                    onChange={(e) => handleGoalInputChange('referrals_confirmed', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">交流完成目標</label>
                  <input
                    type="number"
                    min="0"
                    value={goalForm.exchanges_confirmed}
                    onChange={(e) => handleGoalInputChange('exchanges_confirmed', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>
              {/* 提醒臨界值設定 */}
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">提醒臨界值（達成率低於此值將發提醒）</div>
                    <div className="text-xs text-gray-500 mt-1">範圍 0.0–1.0，建議 0.5</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={reminderThreshold}
                      onChange={(e) => setReminderThreshold(Math.min(1, Math.max(0, Number(e.target.value || 0))))}
                      className="w-24 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      disabled={thresholdLoading}
                    />
                    <button
                      onClick={saveReminderThreshold}
                      disabled={thresholdSaving}
                      className="px-3 py-2 rounded-md text-sm bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-50"
                    >
                      {thresholdSaving ? '儲存中…' : '儲存臨界值'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* KPI 卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white shadow rounded-lg p-4">
                <div className="text-sm text-gray-500">我發出的引薦</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">
                  {dashboardLoading ? '…' : (dashboardSummary?.referrals?.sent ?? 0)}
                </div>
              </div>
              <div className="bg-white shadow rounded-lg p-4">
                <div className="text-sm text-gray-500">我收到的引薦</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">
                  {dashboardLoading ? '…' : (dashboardSummary?.referrals?.received ?? 0)}
                </div>
              </div>
              <div className="bg-white shadow rounded-lg p-4">
                <div className="text-sm text-gray-500">已確認的引薦</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">
                  {dashboardLoading ? '…' : (dashboardSummary?.referrals?.confirmed ?? 0)}
                </div>
              </div>
              <div className="bg-white shadow rounded-lg p-4">
                <div className="text-sm text-gray-500">已完成的業務交流</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">
                  {dashboardLoading ? '…' : (dashboardSummary?.exchanges?.confirmed_meetings ?? 0)}
                </div>
              </div>
            </div>

            {/* 目標 vs 實績 對比圖 */}
            <div className="bg-white shadow rounded-lg p-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">目標 vs 實績</h4>
              {dashboardLoading ? (
                <div className="text-gray-500">載入中…</div>
              ) : (
                (() => {
                  const actuals = {
                    referrals_sent: dashboardSummary?.referrals?.sent ?? 0,
                    referrals_received: dashboardSummary?.referrals?.received ?? 0,
                    referrals_confirmed: dashboardSummary?.referrals?.confirmed ?? 0,
                    exchanges_confirmed: dashboardSummary?.exchanges?.confirmed_meetings ?? 0
                  };
                  const targets = dashboardSummary?.goals || goalForm;
                  const maxVal = Math.max(
                    actuals.referrals_sent,
                    actuals.referrals_received,
                    actuals.referrals_confirmed,
                    actuals.exchanges_confirmed,
                    targets.referrals_sent || 0,
                    targets.referrals_received || 0,
                    targets.referrals_confirmed || 0,
                    targets.exchanges_confirmed || 0,
                    1
                  );
                  const items = [
                    { key: 'referrals_sent', label: '發出引薦', color: 'bg-yellow-500' },
                    { key: 'referrals_received', label: '收到引薦', color: 'bg-blue-500' },
                    { key: 'referrals_confirmed', label: '確認引薦', color: 'bg-green-500' },
                    { key: 'exchanges_confirmed', label: '交流完成', color: 'bg-purple-500' }
                  ];
                  return (
                    <div className="space-y-3">
                      {items.map((it, i) => (
                        <div key={i} className="w-full">
                          <div className="flex justify-between mb-1 text-sm text-gray-700">
                            <span>{it.label}</span>
                            <span className="font-medium">
                              {actuals[it.key]} / {targets[it.key] || 0}
                            </span>
                          </div>
                          <div className="w-full h-4 bg-gray-200 rounded relative overflow-hidden">
                            {/* 目標 */}
                            <div
                              className={`h-4 bg-gray-300 rounded absolute top-0 left-0`}
                              style={{ width: `${((targets[it.key] || 0) / maxVal) * 100}%` }}
                            />
                            {/* 實績 */}
                            <div
                              className={`${it.color} h-4 rounded absolute top-0 left-0`}
                              style={{ width: `${(actuals[it.key] / maxVal) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>

            {/* 週／月趨勢圖（Recharts） */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">週／月趨勢</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSourceDetails((v) => !v)}
                    className="px-3 py-1 rounded-md text-sm border border-gray-300 hover:bg-gray-50"
                  >
                    {showSourceDetails ? '隱藏詳細' : '顯示詳細'}
                  </button>
                </div>
              </div>
              {dashboardLoading ? (
                <SkeletonBlock height={256} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="w-full h-64">
                    <h5 className="text-sm font-medium text-gray-800 mb-2">週趨勢（折線圖）</h5>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weeklyChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="sent" stroke="#2563eb" name="發出引薦" />
                        <Line type="monotone" dataKey="received" stroke="#10b981" name="收到引薦" />
                        <Line type="monotone" dataKey="confirmed" stroke="#f59e0b" name="已確認引薦" />
                        <Line type="monotone" dataKey="exchanges" stroke="#ef4444" name="已完成交流" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full h-64">
                    <h5 className="text-sm font-medium text-gray-800 mb-2">月趨勢（柱狀圖）</h5>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="sent" fill="#2563eb" name="發出引薦" />
                        <Bar dataKey="received" fill="#10b981" name="收到引薦" />
                        <Bar dataKey="confirmed" fill="#f59e0b" name="已確認引薦" />
                        <Bar dataKey="exchanges" fill="#ef4444" name="已完成交流" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={applySuggestedTargets}
                  className="px-3 py-2 rounded-md text-sm bg-gray-800 text-white hover:bg-gray-900"
                >
                  一鍵採用 AI 建議
                </button>
                {prevGoalBackup && (
                  <button
                    onClick={revertSuggestedTargets}
                    className="px-3 py-2 rounded-md text-sm bg-gray-200 text-gray-900 hover:bg-gray-300"
                  >
                    回退到先前目標
                  </button>
                )}
              </div>
            </div>
            {/* 來源分解 Top N */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">來源分解</h4>
                <button onClick={() => fetchSources(timeRange)} className="px-3 py-1 rounded-md text-sm bg-primary-600 text-white hover:bg-primary-700">重新整理</button>
              </div>
              {sourcesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h5 className="text-sm font-medium text-gray-800 mb-2">我發出的引薦 Top 5</h5>
                    <SkeletonList count={5} />
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-gray-800 mb-2">我收到的引薦 Top 5</h5>
                    <SkeletonList count={5} />
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-gray-800 mb-2">已完成交流 Top 5</h5>
                    <SkeletonList count={5} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h5 className="text-sm font-medium text-gray-800 mb-2">我發出的引薦 Top 5</h5>
                    <ul className="space-y-2 text-sm text-gray-700">
                      {(sources?.top_sent_partners || []).map((p, i) => (
                        <li key={i} className="flex justify-between">
                          <span>{p.partner?.name || `ID ${p.partner_id}`}</span>
                          <span>{p.total} 次（確認 {p.confirmed ?? 0}，轉換率 {p.conversion_rate != null ? Math.round(p.conversion_rate * 100) + '%' : '—'}）</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-gray-800 mb-2">我收到的引薦 Top 5</h5>
                    <ul className="space-y-2 text-sm text-gray-700">
                      {(sources?.top_received_partners || []).map((p, i) => (
                        <li key={i} className="flex justify-between">
                          <span>{p.partner?.name || `ID ${p.partner_id}`}</span>
                          <span>{p.total} 次（確認 {p.confirmed ?? 0}，轉換率 {p.conversion_rate != null ? Math.round(p.conversion_rate * 100) + '%' : '—'}）</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-gray-800 mb-2">已完成交流 Top 5</h5>
                    <ul className="space-y-2 text-sm text-gray-700">
                      {(sources?.top_meeting_partners || []).map((p, i) => (
                        <li key={i} className="flex justify-between">
                          <span>{p.partner?.name || `ID ${p.partner_id}`}</span>
                          <span>{p.total} 次</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
            {/* 達成率摘要與操作 */}
            <div className="bg-white shadow rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-3">達成率摘要</h4>
              {dashboardLoading ? (
                <SkeletonBlock height={120} />
              ) : (
                <div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['referrals_sent','referrals_received','referrals_confirmed','exchanges_confirmed'].map((k, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-200 rounded p-3">
                        <div className="text-xs text-gray-500">
                          {k === 'referrals_sent' ? '發出引薦達成率' : k === 'referrals_received' ? '收到引薦達成率' : k === 'referrals_confirmed' ? '確認引薦達成率' : '交流完成達成率'}
                        </div>
                        {(() => {
                          const rate = achievementRates?.[k] ?? 0;
                          const pct = Math.round(rate * 100);
                          const color = rate >= 0.8 ? 'bg-green-500' : rate >= 0.5 ? 'bg-yellow-500' : 'bg-red-500';
                          return (
                            <>
                              <div className="text-xl font-semibold text-gray-900">{pct}%</div>
                              <div className="h-2 bg-gray-200 rounded mt-2">
                                <div className={`h-2 rounded ${color}`} style={{ width: `${pct}%` }}></div>
                              </div>
                              <div className="mt-1 text-xs text-gray-500">{rate >= 0.8 ? '表現佳' : rate >= 0.5 ? '尚可' : '待加強'}</div>
                            </>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={applySuggestedTargets}
                      className="px-3 py-2 rounded-md text-sm bg-gray-800 text-white hover:bg-gray-900"
                    >
                      套用 AI 建議目標
                    </button>
                    <button
                      onClick={notifyAchievements}
                      className="px-3 py-2 rounded-md text-sm bg-yellow-500 text-white hover:bg-yellow-600"
                    >
                      發送達成率提醒（Email/站內）
                    </button>
                    {lastNotifyTime && (
                      <span className="text-xs text-gray-500 ml-2">最近提醒：{formatDate(lastNotifyTime)}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 產品／服務管理 */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">產品／服務管理</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={resetProductForm}
                    className="px-3 py-2 rounded-md text-sm bg-gray-200 text-gray-900 hover:bg-gray-300"
                  >
                    重設表單
                  </button>
                  <button
                    onClick={saveProduct}
                    disabled={productSaving}
                    className="px-3 py-2 rounded-md text-sm bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50"
                  >
                    {productSaving ? '儲存中…' : (editingProductId ? '更新項目' : '新增項目')}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">名稱</label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">價格（可留空）</label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.price}
                    onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">描述</label>
                  <textarea
                    rows="3"
                    value={productForm.description}
                    onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">標籤（以逗點分隔）</label>
                  <input
                    type="text"
                    value={productForm.tags}
                    onChange={(e) => setProductForm((p) => ({ ...p, tags: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="product-active"
                    type="checkbox"
                    checked={productForm.is_active}
                    onChange={(e) => setProductForm((p) => ({ ...p, is_active: e.target.checked }))}
                  />
                  <label htmlFor="product-active" className="text-sm text-gray-700">啟用</label>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-medium text-gray-700">項目列表</h5>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="搜尋名稱／描述／標籤"
                      value={productSearch}
                      onChange={(e) => { setProductSearch(e.target.value); setProductPage(1); }}
                      className="px-2 py-1 border rounded text-sm"
                    />
                    <select
                      value={productPageSize}
                      onChange={(e) => { setProductPageSize(Number(e.target.value)); setProductPage(1); }}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      {[5,10,20].map((n) => (<option key={n} value={n}>{n}/頁</option>))}
                    </select>
                    <button
                      onClick={fetchProductsServices}
                      className="text-sm px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                    >
                      重新整理
                    </button>
                  </div>
                </div>
                {productsLoading ? (
                  <SkeletonList rows={5} density="compact" />
                ) : products.length === 0 ? (
                  <div className="text-gray-600">尚無項目</div>
                ) : (
                  (() => {
                    const keyword = productSearch.trim().toLowerCase();
                    const filtered = products.filter((item) => {
                      if (!keyword) return true;
                      const tagsStr = Array.isArray(item.tags) ? item.tags.join(',') : (item.tags || '');
                      return (
                        (item.name || '').toLowerCase().includes(keyword) ||
                        (item.description || '').toLowerCase().includes(keyword) ||
                        tagsStr.toLowerCase().includes(keyword)
                      );
                    });
                    const totalPages = Math.max(1, Math.ceil(filtered.length / productPageSize));
                    const page = Math.min(productPage, totalPages);
                    const start = (page - 1) * productPageSize;
                    const pageItems = filtered.slice(start, start + productPageSize);
                    return (
                      <div>
                        <div className="divide-y">
                          {pageItems.map((item) => (
                          <div key={item.id} className="py-3 flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">
                                {item.name} {item.is_active ? (
                                  <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">啟用</span>
                                ) : (
                                  <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">停用</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600">
                                {item.description || '—'}
                              </div>
                              <div className="text-sm text-gray-500">
                                價格：{item.price != null ? item.price : '—'}；標籤：{Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || '—')}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEditProduct(item)}
                                className="text-sm px-2 py-1 rounded bg-gray-200 text-gray-900 hover:bg-gray-300"
                              >
                                編輯
                              </button>
                              <button
                                onClick={() => deleteProduct(item.id)}
                                className="text-sm px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600"
                              >
                                刪除
                              </button>
                            </div>
                          </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between mt-3 text-sm">
                          <div className="text-gray-600">第 {page} / {totalPages} 頁（共 {filtered.length} 筆）</div>
                          <div className="flex items-center gap-2">
                            <button
                              disabled={page <= 1}
                              onClick={() => setProductPage(Math.max(1, page - 1))}
                              className="px-2 py-1 border rounded disabled:opacity-50"
                            >上一頁</button>
                            <button
                              disabled={page >= totalPages}
                              onClick={() => setProductPage(Math.min(totalPages, page + 1))}
                              className="px-2 py-1 border rounded disabled:opacity-50"
                            >下一頁</button>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

            {/* 行銷漏斗管理 */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">行銷漏斗管理</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={addFunnelStage}
                    className="px-3 py-2 rounded-md text-sm bg-gray-200 text-gray-900 hover:bg-gray-300"
                  >
                    新增階段
                  </button>
                  <button
                    onClick={saveFunnel}
                    disabled={funnelSaving}
                    className="px-3 py-2 rounded-md text-sm bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50"
                  >
                    {funnelSaving ? '儲存中…' : '儲存配置'}
                  </button>
                </div>
              </div>

              {funnelLoading ? (
                <div className="text-gray-500">載入中…</div>
              ) : (
                <div className="space-y-3">
                  {(funnelConfig.stages || []).length === 0 && (
                    <div className="text-gray-600">尚未設定漏斗階段</div>
                  )}
                  {(funnelConfig.stages || []).map((stg, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2"
                      draggable
                      onDragStart={() => onStageDragStart(idx)}
                      onDragOver={(e) => onStageDragOver(e, idx)}
                      onDrop={() => onStageDrop(idx)}
                    >
                      <input
                        type="text"
                        value={stg}
                        onChange={(e) => updateFunnelStage(idx, e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        placeholder={`階段 ${idx + 1}`}
                      />
                      <button
                        onClick={() => removeFunnelStage(idx)}
                        className="px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 text-sm"
                      >
                        移除
                      </button>
                    </div>
                  ))}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">備註</label>
                    <textarea
                      rows="3"
                      value={funnelConfig.notes}
                      onChange={(e) => setFunnelConfig((p) => ({ ...p, notes: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 無分析數據提示 */}
      {!analysis && !profile?.profile?.ai_insights && (
        <div className="bg-black/40 border border-yellow-500/30 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-yellow-300 mb-2">尚無AI分析數據</h3>
          <p className="text-yellow-200 mb-4">
            您的AI深度畫像尚未完成分析，請點擊上方「更新畫像」按鈕來生成分析報告。
          </p>
          <button
            onClick={handleUpdateProfile}
            disabled={updating}
            className="btn-gold inline-flex items-center px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updating ? (
              <>
                <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                分析中...
              </>
            ) : (
              <>
                <CpuChipIcon className="-ml-1 mr-2 h-4 w-4" />
                開始AI分析
              </>
            )}
          </button>
        </div>
      )}

      {/* 引薦稿 Dialog */}
      {referralDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeReferralDialog} />
          <div className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">建立引薦</h3>
              <button onClick={closeReferralDialog} className="text-gray-500 hover:text-gray-700">×</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-700">
                目標會員：
                <span className="font-medium text-gray-900 ml-1">{selectedMember?.name || '未知'}</span>
                {selectedMember && (
                  <span className="ml-2 text-gray-600">{[selectedMember.company, selectedMember.title].filter(Boolean).join(' / ')}</span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">引薦價值（可選，數字）</label>
                  <input
                    type="number"
                    min="0"
                    value={referralAmount}
                    onChange={(e) => setReferralAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="例如 5000"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">主旨（可選）</label>
                  <input
                    type="text"
                    value={referralSubject}
                    onChange={(e) => setReferralSubject(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="例如：合作引薦與自我介紹"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm text-gray-600">訊息內容（必要）</label>
                  <button
                    type="button"
                    onClick={() => generateReferralDraft(selectedMember)}
                    disabled={generatingDraft}
                    className="text-xs px-2 py-1 rounded border border-yellow-400 text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
                  >
                    {generatingDraft ? '生成中...' : '重新生成草稿'}
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={referralMessage}
                  onChange={(e) => setReferralMessage(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="輸入或編輯引薦訊息內容..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
              <button onClick={closeReferralDialog} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">取消</button>
              <button
                onClick={submitReferral}
                disabled={creatingReferral}
                className="btn-gold px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingReferral ? '送出中...' : '送出引薦'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AIProfilePage;
  // 切換分頁時同步 URL 參數，便於直接分享進入
  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  };