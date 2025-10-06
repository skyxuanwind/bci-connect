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
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Badge,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  Alert,
  Skeleton,
  Divider,
  Tooltip,
  Menu,
  ListItemIcon
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  Psychology as PsychologyIcon,
  Business as BusinessIcon,
  Group as GroupIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Star as StarIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  MoreVert as MoreVertIcon,
  MarkEmailRead as MarkEmailReadIcon,
  Visibility as VisibilityIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';

const NotificationsPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [tabValue, setTabValue] = useState(0);
  const [filters, setFilters] = useState({
    type: '',
    status: 'unread',
    priority: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    collaboration: 0,
    wish: 0,
    meeting: 0,
    market: 0
  });
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: true,
    collaborationOpportunities: true,
    wishOpportunities: true,
    meetingInsights: true,
    marketOpportunities: true
  });
  const [openPreferences, setOpenPreferences] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuNotificationId, setMenuNotificationId] = useState(null);

  // 通知類型配置
  const notificationTypes = {
    collaboration: {
      label: '合作機會',
      icon: <BusinessIcon />,
      color: 'primary'
    },
    wish: {
      label: '許願機會',
      icon: <StarIcon />,
      color: 'secondary'
    },
    meeting: {
      label: '交流洞察',
      icon: <GroupIcon />,
      color: 'info'
    },
    market: {
      label: '市場機會',
      icon: <TrendingUpIcon />,
      color: 'success'
    }
  };

  // 載入通知列表
  const loadNotifications = async (page = 1) => {
    try {
      setLoading(true);
      
      const params = {
        page,
        limit: 20,
        ...filters
      };

      // 根據標籤頁調整篩選
      if (tabValue === 1) {
        params.status = 'read';
      } else if (tabValue === 0) {
        params.status = 'unread';
      } else {
        delete params.status;
      }

      const response = await api.get('/api/notifications', { params });
      
      if (response.data.success) {
        setNotifications(response.data.data.notifications);
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      console.error('載入通知失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  // 載入通知統計
  const loadStats = async () => {
    try {
      const response = await api.get('/api/notifications/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('載入統計失敗:', error);
    }
  };

  // 載入用戶偏好設定
  const loadPreferences = async () => {
    try {
      const response = await api.get('/api/ai-profiles/current');
      if (response.data.success && response.data.data.notificationPreferences) {
        setPreferences(response.data.data.notificationPreferences);
      }
    } catch (error) {
      console.error('載入偏好設定失敗:', error);
    }
  };

  // 標記通知為已讀
  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/api/notifications/${notificationId}/read`);
      
      // 更新本地狀態
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, status: 'read', readAt: new Date().toISOString() }
            : notif
        )
      );
      
      loadStats();
    } catch (error) {
      console.error('標記已讀失敗:', error);
    }
  };

  // 批量標記為已讀
  const markAllAsRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      loadNotifications(pagination.page);
      loadStats();
    } catch (error) {
      console.error('批量標記已讀失敗:', error);
    }
  };

  // 刪除通知
  const deleteNotification = async (notificationId) => {
    if (!window.confirm('確定要刪除這個通知嗎？')) {
      return;
    }

    try {
      await api.delete(`/api/notifications/${notificationId}`);
      loadNotifications(pagination.page);
      loadStats();
      setAnchorEl(null);
    } catch (error) {
      console.error('刪除通知失敗:', error);
    }
  };

  // 忽略通知
  const dismissNotification = async (notificationId) => {
    try {
      await api.put(`/api/notifications/${notificationId}/dismiss`);
      
      // 更新本地狀態
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, status: 'dismissed' }
            : notif
        )
      );
      
      loadStats();
      setAnchorEl(null);
    } catch (error) {
      console.error('忽略通知失敗:', error);
    }
  };

  // 手動掃描機會
  // 已移除手動掃描機會功能

  // 更新偏好設定
  const updatePreferences = async () => {
    try {
      await api.put('/api/notifications/preferences', { preferences });
      setOpenPreferences(false);
    } catch (error) {
      console.error('更新偏好設定失敗:', error);
    }
  };

  // 查看通知詳情
  const viewNotificationDetail = (notification) => {
    setSelectedNotification(notification);
    setOpenDetailDialog(true);
    
    // 如果是未讀通知，標記為已讀
    if (notification.status === 'unread') {
      markAsRead(notification.id);
    }
  };

  // 處理選單
  const handleMenuClick = (event, notificationId) => {
    setAnchorEl(event.currentTarget);
    setMenuNotificationId(notificationId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuNotificationId(null);
  };

  // 獲取通知圖標
  const getNotificationIcon = (type) => {
    return notificationTypes[type]?.icon || <NotificationsIcon />;
  };

  // 獲取通知顏色
  const getNotificationColor = (type) => {
    return notificationTypes[type]?.color || 'default';
  };

  // 獲取優先級顏色
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      default: return 'info';
    }
  };

  useEffect(() => {
    loadNotifications();
    loadStats();
    loadPreferences();
  }, [tabValue, filters.type, filters.priority]);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* 頁面標題 */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            🔔 AI 智慧通知
          </Typography>
          <Box>
            {/* 已移除掃描機會按鈕 */}
            <Button 
              variant="outlined"
              onClick={() => setOpenPreferences(true)}
              startIcon={<SettingsIcon />}
            >
              設定
            </Button>
          </Box>
        </Box>
        <Typography variant="subtitle1" color="text.secondary">
          AI 為您主動發現的商業機會和合作建議
        </Typography>
      </Box>

      {/* 統計卡片 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Badge badgeContent={stats.unread} color="error">
                <NotificationsActiveIcon color="primary" sx={{ fontSize: 40 }} />
              </Badge>
              <Typography variant="h6" sx={{ mt: 1 }}>
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                總通知
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <BusinessIcon color="primary" sx={{ fontSize: 40 }} />
              <Typography variant="h6" sx={{ mt: 1 }}>
                {stats.collaboration}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                合作機會
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* 已移除許願機會統計卡片 */}
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <GroupIcon color="info" sx={{ fontSize: 40 }} />
              <Typography variant="h6" sx={{ mt: 1 }}>
                {stats.meeting}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                交流洞察
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUpIcon color="success" sx={{ fontSize: 40 }} />
              <Typography variant="h6" sx={{ mt: 1 }}>
                {stats.market}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                市場機會
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Button 
                fullWidth
                variant="contained"
                onClick={markAllAsRead}
                disabled={stats.unread === 0}
                startIcon={<MarkEmailReadIcon />}
                size="small"
              >
                全部已讀
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 標籤頁和篩選 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
              <Tab label={`未讀 (${stats.unread})`} />
              <Tab label="已讀" />
              <Tab label="全部" />
            </Tabs>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>類型</InputLabel>
                <Select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  label="類型"
                >
                  <MenuItem value="">全部</MenuItem>
                  <MenuItem value="collaboration">合作機會</MenuItem>
                  {/* 已移除許願機會類型選項 */}
                  <MenuItem value="meeting">交流洞察</MenuItem>
                  <MenuItem value="market">市場機會</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>優先級</InputLabel>
                <Select
                  value={filters.priority}
                  onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                  label="優先級"
                >
                  <MenuItem value="">全部</MenuItem>
                  <MenuItem value="high">高</MenuItem>
                  <MenuItem value="medium">中</MenuItem>
                  <MenuItem value="low">低</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 通知列表 */}
      {loading ? (
        <Card>
          <CardContent>
            {[...Array(5)].map((_, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="80%" />
                  </Box>
                  <Skeleton variant="rectangular" width={60} height={24} />
                </Box>
                {index < 4 && <Divider sx={{ mt: 2 }} />}
              </Box>
            ))}
          </CardContent>
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <NotificationsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {tabValue === 0 ? '沒有未讀通知' : '沒有通知'}
            </Typography>
            {/* 已移除掃描提示與按鈕 */}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <List>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    sx={{
                      bgcolor: notification.status === 'unread' ? 'action.hover' : 'transparent',
                      borderLeft: notification.status === 'unread' ? '4px solid' : 'none',
                      borderLeftColor: notification.status === 'unread' ? 'primary.main' : 'transparent'
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar 
                        sx={{ 
                          bgcolor: `${getNotificationColor(notification.type)}.main`,
                          color: 'white'
                        }}
                      >
                        {getNotificationIcon(notification.type)}
                      </Avatar>
                    </ListItemAvatar>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" component="span">
                            {notification.title}
                          </Typography>
                          <Chip 
                            size="small" 
                            label={notificationTypes[notification.type]?.label || notification.type}
                            color={getNotificationColor(notification.type)}
                            variant="outlined"
                          />
                          {notification.priority !== 'low' && (
                            <Chip 
                              size="small" 
                              label={notification.priority === 'high' ? '高優先級' : '中優先級'}
                              color={getPriorityColor(notification.priority)}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDistanceToNow(new Date(notification.createdAt), { 
                              addSuffix: true, 
                              locale: zhTW 
                            })}
                          </Typography>
                        </Box>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Tooltip title="查看詳情">
                          <IconButton 
                            onClick={() => viewNotificationDetail(notification)}
                            size="small"
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        
                        {notification.status === 'unread' && (
                          <Tooltip title="標記已讀">
                            <IconButton 
                              onClick={() => markAsRead(notification.id)}
                              size="small"
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        <IconButton 
                          onClick={(e) => handleMenuClick(e, notification.id)}
                          size="small"
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Card>

          {/* 分頁 */}
          {pagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination 
                count={pagination.totalPages}
                page={pagination.page}
                onChange={(e, page) => loadNotifications(page)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* 操作選單 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          const notification = notifications.find(n => n.id === menuNotificationId);
          if (notification && notification.status === 'unread') {
            markAsRead(menuNotificationId);
          }
          handleMenuClose();
        }}>
          <ListItemIcon>
            <CheckCircleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>標記已讀</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => dismissNotification(menuNotificationId)}>
          <ListItemIcon>
            <CancelIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>忽略</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => deleteNotification(menuNotificationId)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>刪除</ListItemText>
        </MenuItem>
      </Menu>

      {/* 通知詳情對話框 */}
      <Dialog 
        open={openDetailDialog} 
        onClose={() => {
          setOpenDetailDialog(false);
          setSelectedNotification(null);
        }}
        maxWidth="md"
        fullWidth
      >
        {selectedNotification && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getNotificationIcon(selectedNotification.type)}
                {selectedNotification.title}
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" paragraph>
                {selectedNotification.message}
              </Typography>
              
              {selectedNotification.data && (
                <Card variant="outlined" sx={{ mt: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      詳細信息
                    </Typography>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                      {JSON.stringify(selectedNotification.data, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
              
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Chip 
                  label={notificationTypes[selectedNotification.type]?.label || selectedNotification.type}
                  color={getNotificationColor(selectedNotification.type)}
                />
                <Chip 
                  label={`${selectedNotification.priority === 'high' ? '高' : selectedNotification.priority === 'medium' ? '中' : '低'}優先級`}
                  color={getPriorityColor(selectedNotification.priority)}
                />
                <Chip 
                  label={selectedNotification.status === 'unread' ? '未讀' : '已讀'}
                  color={selectedNotification.status === 'unread' ? 'primary' : 'default'}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => {
                setOpenDetailDialog(false);
                setSelectedNotification(null);
              }}>
                關閉
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* 偏好設定對話框 */}
      <Dialog 
        open={openPreferences} 
        onClose={() => setOpenPreferences(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          ⚙️ 通知偏好設定
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="h6" gutterBottom>
              通知方式
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.emailNotifications}
                  onChange={(e) => setPreferences(prev => ({ 
                    ...prev, 
                    emailNotifications: e.target.checked 
                  }))}
                />
              }
              label="電子郵件通知"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.pushNotifications}
                  onChange={(e) => setPreferences(prev => ({ 
                    ...prev, 
                    pushNotifications: e.target.checked 
                  }))}
                />
              }
              label="推播通知"
            />
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="h6" gutterBottom>
              通知類型
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.collaborationOpportunities}
                  onChange={(e) => setPreferences(prev => ({ 
                    ...prev, 
                    collaborationOpportunities: e.target.checked 
                  }))}
                />
              }
              label="合作機會推薦"
            />
            {/* 已移除許願機會匹配偏好設定 */}
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.meetingInsights}
                  onChange={(e) => setPreferences(prev => ({ 
                    ...prev, 
                    meetingInsights: e.target.checked 
                  }))}
                />
              }
              label="交流洞察分析"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.marketOpportunities}
                  onChange={(e) => setPreferences(prev => ({ 
                    ...prev, 
                    marketOpportunities: e.target.checked 
                  }))}
                />
              }
              label="市場機會提醒"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPreferences(false)}>
            取消
          </Button>
          <Button onClick={updatePreferences} variant="contained">
            儲存設定
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default NotificationsPage;