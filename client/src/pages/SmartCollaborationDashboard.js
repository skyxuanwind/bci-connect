import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Skeleton,
  Fab,
  Badge,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Notifications as NotificationsIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Lightbulb as LightbulbIcon,
  Psychology as PsychologyIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Star as StarIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';

const SmartCollaborationDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState([]);
  const [recentWishes, setRecentWishes] = useState([]);
  const [similarMembers, setSimilarMembers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [aiProfile, setAiProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [openWishDialog, setOpenWishDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // 許願表單狀態
  const [wishForm, setWishForm] = useState({
    title: '',
    description: '',
    category: '',
    tags: [],
    priority: 1
  });
  const [submittingWish, setSubmittingWish] = useState(false);

  // 載入儀表板數據
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // 並行載入所有數據
      const [opportunitiesRes, wishesRes, membersRes, notificationsRes, profileRes] = await Promise.all([
        api.get('/api/notifications/opportunities?limit=5'),
        api.get('/api/wishes?limit=6&status=active'),
        api.get('/api/ai-profiles/me/similar-members?limit=4&minScore=70'),
        api.get('/api/notifications?limit=5&status=unread'),
        api.get('/api/ai-profiles/me')
      ]);

      if (opportunitiesRes.data.success) {
        setOpportunities(opportunitiesRes.data.data.opportunities || []);
      }

      if (wishesRes.data.success) {
        setRecentWishes(wishesRes.data.data.wishes || []);
      }

      if (membersRes.data.success) {
        setSimilarMembers(membersRes.data.data.similarMembers || []);
      }

      if (notificationsRes.data.success) {
        setNotifications(notificationsRes.data.data.notifications || []);
      }

      if (profileRes.data.success) {
        setAiProfile(profileRes.data.data);
      }

    } catch (error) {
      console.error('載入儀表板數據失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  // 手動刷新機會
  const refreshOpportunities = async () => {
    try {
      setRefreshing(true);
      await api.post('/api/notifications/scan-opportunities');
      
      // 等待一下再重新載入
      setTimeout(() => {
        loadDashboardData();
        setRefreshing(false);
      }, 2000);
    } catch (error) {
      console.error('刷新機會失敗:', error);
      setRefreshing(false);
    }
  };

  // 創建許願
  const handleCreateWish = async () => {
    try {
      setSubmittingWish(true);
      
      const response = await api.post('/api/wishes', wishForm);
      
      if (response.data.success) {
        setOpenWishDialog(false);
        setWishForm({ title: '', description: '', category: '', tags: [], priority: 1 });
        loadDashboardData(); // 重新載入數據
      }
    } catch (error) {
      console.error('創建許願失敗:', error);
    } finally {
      setSubmittingWish(false);
    }
  };

  // 標記通知為已讀
  const markNotificationAsRead = async (notificationId) => {
    try {
      await api.put(`/api/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, status: 'read' } : n)
      );
    } catch (error) {
      console.error('標記通知失敗:', error);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // 獲取優先級顏色
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 3: return 'error';
      case 2: return 'warning';
      default: return 'info';
    }
  };

  // 獲取通知類型圖標
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'collaboration_opportunity': return <PeopleIcon />;
      case 'wish_opportunity': return <LightbulbIcon />;
      case 'meeting_insights': return <PsychologyIcon />;
      case 'market_opportunity': return <TrendingUpIcon />;
      default: return <NotificationsIcon />;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          {[...Array(6)].map((_, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={32} />
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="rectangular" width="100%" height={60} sx={{ mt: 2 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* 頁面標題 */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            🤖 GBC 智慧合作網絡
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            AI 驅動的智慧商業生態系統 - 讓機會主動找到您
          </Typography>
        </Box>
        <Box>
          <Tooltip title="刷新AI機會掃描">
            <IconButton 
              onClick={refreshOpportunities} 
              disabled={refreshing}
              color="primary"
            >
              <RefreshIcon className={refreshing ? 'rotating' : ''} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* AI 畫像完整度提示 */}
      {aiProfile && aiProfile.profileCompleteness < 70 && (
        <Alert 
          severity="info" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" href="/profile">
              完善資料
            </Button>
          }
        >
          您的AI深度畫像完整度為 {aiProfile.profileCompleteness}%，建議完善個人資料以獲得更精準的AI推薦
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* AI 推薦機會 */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2">
                  🎯 AI 為您推薦的機會
                </Typography>
                <Badge badgeContent={opportunities.length} color="primary">
                  <TrendingUpIcon />
                </Badge>
              </Box>
              
              {opportunities.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <PsychologyIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    AI 正在為您分析最佳合作機會...
                  </Typography>
                  <Button 
                    variant="outlined" 
                    onClick={refreshOpportunities}
                    sx={{ mt: 2 }}
                    disabled={refreshing}
                  >
                    立即掃描
                  </Button>
                </Box>
              ) : (
                <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                  {opportunities.map((opportunity) => (
                    <Card key={opportunity.id} variant="outlined" sx={{ mb: 2 }}>
                      <CardContent sx={{ pb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                          {getNotificationIcon(opportunity.type)}
                          <Box sx={{ ml: 1, flex: 1 }}>
                            <Typography variant="subtitle2" component="h3">
                              {opportunity.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {opportunity.message}
                            </Typography>
                            
                            {/* AI 推薦理由 */}
                            {opportunity.aiReasoning && (
                              <Box sx={{ 
                                bgcolor: 'primary.50', 
                                p: 1, 
                                borderRadius: 1, 
                                border: '1px solid',
                                borderColor: 'primary.200',
                                mb: 1
                              }}>
                                <Typography variant="caption" color="primary.main">
                                  🤖 AI 推薦理由：{opportunity.aiReasoning}
                                </Typography>
                              </Box>
                            )}
                            
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" color="text.secondary">
                                {formatDistanceToNow(new Date(opportunity.createdAt), { 
                                  addSuffix: true, 
                                  locale: zhTW 
                                })}
                              </Typography>
                              <Box>
                                <Chip 
                                  size="small" 
                                  label={`優先級 ${opportunity.priority}`}
                                  color={getPriorityColor(opportunity.priority)}
                                  sx={{ mr: 1 }}
                                />
                                <Button 
                                  size="small" 
                                  variant="contained"
                                  onClick={() => markNotificationAsRead(opportunity.id)}
                                >
                                  查看詳情
                                </Button>
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 側邊欄 */}
        <Grid item xs={12} lg={4}>
          <Grid container spacing={2}>
            {/* 最新通知 */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="h2" gutterBottom>
                    🔔 最新通知
                  </Typography>
                  {notifications.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      暫無新通知
                    </Typography>
                  ) : (
                    <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                      {notifications.slice(0, 3).map((notification) => (
                        <Box key={notification.id} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="body2">
                            {notification.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDistanceToNow(new Date(notification.createdAt), { 
                              addSuffix: true, 
                              locale: zhTW 
                            })}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                  <Button size="small" href="/notifications" sx={{ mt: 1 }}>
                    查看全部
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* AI 畫像狀態 */}
            {aiProfile && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" component="h2" gutterBottom>
                      🧠 AI 深度畫像
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        完整度: {aiProfile.profileCompleteness}%
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={aiProfile.profileCompleteness} 
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                    <Button size="small" href="/ai-profile" variant="outlined">
                      查看詳細分析
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Grid>

        {/* 最新許願 */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2">
                  💡 最新許願
                </Typography>
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => setOpenWishDialog(true)}
                  startIcon={<AddIcon />}
                >
                  發布許願
                </Button>
              </Box>
              
              {recentWishes.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <LightbulbIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    還沒有許願，成為第一個發布者！
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                  {recentWishes.slice(0, 4).map((wish) => (
                    <Card key={wish.id} variant="outlined" sx={{ mb: 1 }}>
                      <CardContent sx={{ pb: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          {wish.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {wish.description.length > 100 
                            ? `${wish.description.substring(0, 100)}...` 
                            : wish.description
                          }
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar 
                              src={wish.user.profilePicture} 
                              sx={{ width: 24, height: 24, mr: 1 }}
                            >
                              {wish.user.name.charAt(0)}
                            </Avatar>
                            <Typography variant="caption">
                              {wish.user.name}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {formatDistanceToNow(new Date(wish.createdAt), { 
                              addSuffix: true, 
                              locale: zhTW 
                            })}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
              
              <Button size="small" href="/wishes" sx={{ mt: 1 }}>
                查看全部許願
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* 相似會員推薦 */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                👥 您可能感興趣的會員
              </Typography>
              
              {similarMembers.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <PeopleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    AI 正在分析相似會員...
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                  {similarMembers.map((member) => (
                    <Card key={member.member.id} variant="outlined" sx={{ mb: 1 }}>
                      <CardContent sx={{ pb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Avatar 
                            src={member.member.profilePicture} 
                            sx={{ width: 40, height: 40, mr: 2 }}
                          >
                            {member.member.name.charAt(0)}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2">
                              {member.member.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {member.member.company} • {member.member.industry}
                            </Typography>
                          </Box>
                          <Chip 
                            size="small" 
                            label={`${member.score}% 匹配`}
                            color="primary"
                            variant="outlined"
                          />
                        </Box>
                        
                        {member.reasoning && (
                          <Typography variant="caption" color="text.secondary">
                            🤖 {member.reasoning}
                          </Typography>
                        )}
                        
                        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                          <Button size="small" startIcon={<PersonAddIcon />}>
                            發起面談
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 發布許願對話框 */}
      <Dialog 
        open={openWishDialog} 
        onClose={() => setOpenWishDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          💡 發布新許願
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="許願標題"
              value={wishForm.title}
              onChange={(e) => setWishForm(prev => ({ ...prev, title: e.target.value }))}
              sx={{ mb: 2 }}
              placeholder="例如：尋找電商行銷合作夥伴"
            />
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="詳細描述"
              value={wishForm.description}
              onChange={(e) => setWishForm(prev => ({ ...prev, description: e.target.value }))}
              sx={{ mb: 2 }}
              placeholder="詳細描述您的需求、目標客群、合作方式等..."
            />
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>分類</InputLabel>
              <Select
                value={wishForm.category}
                onChange={(e) => setWishForm(prev => ({ ...prev, category: e.target.value }))}
                label="分類"
              >
                <MenuItem value="marketing">行銷合作</MenuItem>
                <MenuItem value="technology">技術合作</MenuItem>
                <MenuItem value="supply_chain">供應鏈合作</MenuItem>
                <MenuItem value="investment">投資機會</MenuItem>
                <MenuItem value="partnership">策略夥伴</MenuItem>
                <MenuItem value="other">其他</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>優先級</InputLabel>
              <Select
                value={wishForm.priority}
                onChange={(e) => setWishForm(prev => ({ ...prev, priority: e.target.value }))}
                label="優先級"
              >
                <MenuItem value={1}>一般</MenuItem>
                <MenuItem value={2}>重要</MenuItem>
                <MenuItem value={3}>緊急</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenWishDialog(false)}>
            取消
          </Button>
          <Button 
            onClick={handleCreateWish}
            variant="contained"
            disabled={!wishForm.title || !wishForm.description || submittingWish}
          >
            {submittingWish ? '發布中...' : '發布許願'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 浮動操作按鈕 */}
      <Fab 
        color="primary" 
        aria-label="add wish"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setOpenWishDialog(true)}
      >
        <AddIcon />
      </Fab>

      <style jsx>{`
        .rotating {
          animation: rotate 1s linear infinite;
        }
        
        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </Container>
  );
};

export default SmartCollaborationDashboard;