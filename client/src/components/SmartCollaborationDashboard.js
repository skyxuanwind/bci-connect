import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Fab,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Notifications as NotificationsIcon,
  Psychology as PsychologyIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import api from '../services/api';

const SmartCollaborationDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    opportunities: [],
    wishes: [],
    similarMembers: [],
    notifications: [],
    aiProfile: null
  });
  const [loading, setLoading] = useState(true);
  const [showCreateWish, setShowCreateWish] = useState(false);
  const [newWish, setNewWish] = useState({
    title: '',
    description: '',
    category: '',
    collaboration_type: '',
    urgency_level: 1
  });
  const [refreshing, setRefreshing] = useState(false);

  const categories = [
    '技術合作', '商業夥伴', '資源共享', '知識交流', 
    '投資機會', '市場拓展', '人才招募', '其他'
  ];

  const collaborationTypes = [
    '短期項目', '長期合作', '一次性服務', '持續合作',
    '技術支援', '商業諮詢', '資源交換', '策略聯盟'
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [opportunitiesRes, wishesRes, membersRes, notificationsRes, profileRes] = await Promise.all([
        api.get('/api/notifications/opportunities'),
        api.get('/api/wishes/my-wishes'),
        api.get('/api/ai-profiles/similar-members'),
        api.get('/api/notifications', { params: { limit: 5 } }),
        api.get('/api/ai-profiles/current')
      ]);

      const opportunities = Array.isArray(opportunitiesRes.data) ? opportunitiesRes.data : (opportunitiesRes.data?.opportunities || []);
      const wishes = Array.isArray(wishesRes.data) ? wishesRes.data : (wishesRes.data?.wishes || []);
      const similarMembers = Array.isArray(membersRes.data) ? membersRes.data : (membersRes.data?.members || []);
      const notifications = notificationsRes.data?.notifications || (Array.isArray(notificationsRes.data) ? notificationsRes.data : []);
      const aiProfile = profileRes.data || null;

      setDashboardData({
        opportunities: opportunities.slice(0, 5),
        wishes: wishes.slice(0, 5),
        similarMembers: similarMembers.slice(0, 5),
        notifications,
        aiProfile
      });
    } catch (error) {
      console.error('載入儀表板數據失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshOpportunities = async () => {
    try {
      setRefreshing(true);
      await api.post('/api/notifications/scan-opportunities');
      const opportunitiesRes = await api.get('/api/notifications/opportunities');
      const opportunities = Array.isArray(opportunitiesRes.data) ? opportunitiesRes.data : (opportunitiesRes.data?.opportunities || []);
      setDashboardData(prev => ({
        ...prev,
        opportunities: opportunities.slice(0, 5)
      }));
    } catch (error) {
      console.error('刷新機會失敗:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const createWish = async () => {
    try {
      await api.post('/api/wishes', newWish);
      setShowCreateWish(false);
      setNewWish({
        title: '',
        description: '',
        category: '',
        collaboration_type: '',
        urgency_level: 1
      });
      loadDashboardData();
    } catch (error) {
      console.error('創建願望失敗:', error);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await api.put(`/api/notifications/${notificationId}/read`);
      setDashboardData(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => 
          n.id === notificationId ? { ...n, status: 'read' } : n
        )
      }));
    } catch (error) {
      console.error('標記通知為已讀失敗:', error);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          AI 智能協作網絡
        </Typography>
        <Button
          variant="outlined"
          startIcon={refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
          onClick={refreshOpportunities}
          disabled={refreshing}
        >
          {refreshing ? '掃描中...' : '刷新機會'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* AI 推薦機會 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">AI 推薦機會</Typography>
              </Box>
              {dashboardData.opportunities.length === 0 ? (
                <Alert severity="info">暫無推薦機會</Alert>
              ) : (
                <List>
                  {dashboardData.opportunities.map((opportunity, index) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={opportunity.title}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {opportunity.description}
                            </Typography>
                            <Chip 
                              label={opportunity.type} 
                              size="small" 
                              sx={{ mt: 1 }}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 我的願望 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center">
                  <PsychologyIcon color="secondary" sx={{ mr: 1 }} />
                  <Typography variant="h6">我的願望</Typography>
                </Box>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setShowCreateWish(true)}
                >
                  新增
                </Button>
              </Box>
              {dashboardData.wishes.length === 0 ? (
                <Alert severity="info">還沒有創建任何願望</Alert>
              ) : (
                <List>
                  {dashboardData.wishes.map((wish) => (
                    <ListItem key={wish.id} divider>
                      <ListItemText
                        primary={wish.title}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {wish.description}
                            </Typography>
                            <Box mt={1}>
                              <Chip label={wish.category} size="small" sx={{ mr: 1 }} />
                              <Chip 
                                label={`緊急度: ${wish.urgency_level}`} 
                                size="small" 
                                color={wish.urgency_level >= 3 ? 'error' : 'default'}
                              />
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 相似會員 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <PeopleIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">相似會員</Typography>
              </Box>
              {dashboardData.similarMembers.length === 0 ? (
                <Alert severity="info">暫無相似會員數據</Alert>
              ) : (
                <List>
                  {dashboardData.similarMembers.map((member) => (
                    <ListItem key={member.id}>
                      <ListItemAvatar>
                        <Avatar>{member.name?.charAt(0) || 'M'}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={member.name}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {member.company || '未提供公司資訊'}
                            </Typography>
                            <Typography variant="caption" color="primary">
                              相似度: {Math.round((member.similarity || 0) * 100)}%
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 最新通知 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Badge 
                  badgeContent={dashboardData.notifications.filter(n => n.status === 'unread').length} 
                  color="error"
                >
                  <NotificationsIcon color="warning" sx={{ mr: 1 }} />
                </Badge>
                <Typography variant="h6" sx={{ ml: 1 }}>最新通知</Typography>
              </Box>
              {dashboardData.notifications.length === 0 ? (
                <Alert severity="info">暫無通知</Alert>
              ) : (
                <List>
                  {dashboardData.notifications.map((notification) => (
                    <ListItem 
                      key={notification.id} 
                      divider
                      sx={{ 
                        bgcolor: notification.status === 'unread' ? 'action.hover' : 'transparent',
                        cursor: 'pointer'
                      }}
                      onClick={() => markNotificationAsRead(notification.id)}
                    >
                      <ListItemText
                        primary={notification.title}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {notification.content}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {format(new Date(notification.created_at), 'MM/dd HH:mm', { locale: zhTW })}
                            </Typography>
                          </Box>
                        }
                      />
                      {notification.status === 'unread' && (
                        <Box 
                          sx={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            bgcolor: 'primary.main',
                            ml: 1
                          }} 
                        />
                      )}
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 創建願望對話框 */}
      <Dialog open={showCreateWish} onClose={() => setShowCreateWish(false)} maxWidth="sm" fullWidth>
        <DialogTitle>創建新願望</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="願望標題"
              value={newWish.title}
              onChange={(e) => setNewWish(prev => ({ ...prev, title: e.target.value }))}
              margin="normal"
            />
            <TextField
              fullWidth
              label="詳細描述"
              multiline
              rows={3}
              value={newWish.description}
              onChange={(e) => setNewWish(prev => ({ ...prev, description: e.target.value }))}
              margin="normal"
            />
            <TextField
              fullWidth
              select
              label="類別"
              value={newWish.category}
              onChange={(e) => setNewWish(prev => ({ ...prev, category: e.target.value }))}
              margin="normal"
            >
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              select
              label="合作類型"
              value={newWish.collaboration_type}
              onChange={(e) => setNewWish(prev => ({ ...prev, collaboration_type: e.target.value }))}
              margin="normal"
            >
              {collaborationTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              select
              label="緊急程度"
              value={newWish.urgency_level}
              onChange={(e) => setNewWish(prev => ({ ...prev, urgency_level: parseInt(e.target.value) }))}
              margin="normal"
            >
              <MenuItem value={1}>低</MenuItem>
              <MenuItem value={2}>中</MenuItem>
              <MenuItem value={3}>高</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateWish(false)}>取消</Button>
          <Button 
            onClick={createWish} 
            variant="contained"
            disabled={!newWish.title || !newWish.description || !newWish.category}
          >
            創建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 浮動操作按鈕 */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setShowCreateWish(true)}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
};

export default SmartCollaborationDashboard;