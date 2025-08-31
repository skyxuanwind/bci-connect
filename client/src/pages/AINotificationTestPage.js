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
  Alert,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fade,
  Slide
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  Psychology as PsychologyIcon,
  Business as BusinessIcon,
  Group as GroupIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  CheckCircle as CheckCircleIcon,
  Visibility as VisibilityIcon,
  Schedule as ScheduleIcon,
  AutoAwesome as AutoAwesomeIcon,
  Lightbulb as LightbulbIcon,
  Handshake as HandshakeIcon,
  Analytics as AnalyticsIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';

const AINotificationTestPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  // 模擬通知數據
  const mockNotifications = [
    {
      id: 1,
      type: 'collaboration_opportunity',
      title: '🤝 AI發現新的合作機會！',
      content: 'AI合作網絡發現新機會！根據您的商業畫像，張明華（創新科技有限公司）與您有高度合作潛力。系統評估匹配度達92分，建議您立即發起商務面談。',
      status: 'unread',
      priority: 3,
      matchingScore: 92,
      aiReasoning: '基於商業互補性和協同效應分析，該會員與您的合作潛力評分為92分。雙方在技術創新和市場拓展方面具有高度互補性。',
      relatedUser: {
        id: 101,
        name: '張明華',
        company: '創新科技有限公司',
        avatar: 'https://via.placeholder.com/40/4CAF50/FFFFFF?text=張'
      },
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30分鐘前
    },
    {
      id: 2,
      type: 'wish_opportunity',
      title: '🎯 AI為您發現新商機！',
      content: 'AI合作網絡發現新機會！李佳琪（綠能環保股份有限公司）剛剛發布了「尋找智慧節能解決方案合作夥伴」的商業需求。這與您的專業背景高度吻合，匹配度達88分。',
      status: 'unread',
      priority: 2,
      matchingScore: 88,
      aiReasoning: '基於您的AI深度畫像分析，該商業需求與您的專業能力和合作意向高度匹配，評分為88分。您在智慧節能領域的專業經驗正是對方所需。',
      relatedUser: {
        id: 102,
        name: '李佳琪',
        company: '綠能環保股份有限公司',
        avatar: 'https://via.placeholder.com/40/2196F3/FFFFFF?text=李'
      },
      relatedWish: {
        id: 201,
        title: '尋找智慧節能解決方案合作夥伴'
      },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2小時前
    },
    {
      id: 3,
      type: 'meeting_insights',
      title: '💡 會議智慧洞察',
      content: '您的最近會議中發現了重要的商業洞察和合作機會，AI已為您整理了關鍵要點和後續建議。會議中提及的數位轉型需求與您的服務高度匹配。',
      status: 'read',
      priority: 2,
      aiReasoning: '基於會議內容的語意分析，識別出潛在的商業價值和合作機會。會議參與者對數位轉型的討論顯示出明確的合作意向。',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4小時前
      readAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 4,
      type: 'market_opportunity',
      title: '📈 市場趨勢機會提醒',
      content: 'AI市場分析發現，ESG永續發展領域正在快速成長，預計未來6個月將有35%的成長機會。根據您的業務背景，建議關注相關合作機會。',
      status: 'unread',
      priority: 1,
      aiReasoning: '基於市場數據分析和您的業務畫像，ESG領域的成長趨勢與您的專業領域高度相關，建議積極布局。',
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() // 6小時前
    },
    {
      id: 5,
      type: 'collaboration_opportunity',
      title: '🤝 跨產業合作建議',
      content: 'AI分析顯示，王志明（數位行銷顧問公司）的客戶群與您的服務領域有高度重疊性。建議考慮策略聯盟，預估可提升30%的市場覆蓋率。',
      status: 'read',
      priority: 2,
      matchingScore: 85,
      aiReasoning: '基於客戶群分析和市場重疊度計算，雙方合作可實現1+1>2的協同效應。',
      relatedUser: {
        id: 103,
        name: '王志明',
        company: '數位行銷顧問公司',
        avatar: 'https://via.placeholder.com/40/FF9800/FFFFFF?text=王'
      },
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1天前
      readAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()
    }
  ];

  // 通知類型配置
  const notificationTypes = {
    collaboration_opportunity: {
      label: '合作機會',
      icon: <HandshakeIcon />,
      color: '#4CAF50',
      bgColor: '#E8F5E8'
    },
    wish_opportunity: {
      label: '許願機會',
      icon: <StarIcon />,
      color: '#FF9800',
      bgColor: '#FFF3E0'
    },
    meeting_insights: {
      label: '會議洞察',
      icon: <AnalyticsIcon />,
      color: '#2196F3',
      bgColor: '#E3F2FD'
    },
    market_opportunity: {
      label: '市場機會',
      icon: <TrendingUpIcon />,
      color: '#9C27B0',
      bgColor: '#F3E5F5'
    }
  };

  // 優先級配置
  const priorityConfig = {
    1: { label: '一般', color: '#757575', bgColor: '#F5F5F5' },
    2: { label: '重要', color: '#FF9800', bgColor: '#FFF3E0' },
    3: { label: '緊急', color: '#F44336', bgColor: '#FFEBEE' }
  };

  // 載入模擬數據
  const loadMockData = () => {
    setLoading(true);
    setTimeout(() => {
      setNotifications(mockNotifications);
      setLoading(false);
      setAnimationKey(prev => prev + 1);
    }, 1000);
  };

  // 標記通知為已讀
  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, status: 'read', readAt: new Date().toISOString() }
          : notif
      )
    );
  };

  // 查看通知詳情
  const viewNotificationDetail = (notification) => {
    setSelectedNotification(notification);
    setOpenDetailDialog(true);
    
    if (notification.status === 'unread') {
      markAsRead(notification.id);
    }
  };

  // 獲取通知圖標
  const getNotificationIcon = (type) => {
    return notificationTypes[type]?.icon || <NotificationsIcon />;
  };

  // 獲取匹配分數顏色
  const getScoreColor = (score) => {
    if (score >= 90) return '#4CAF50';
    if (score >= 80) return '#FF9800';
    if (score >= 70) return '#2196F3';
    return '#757575';
  };

  // 統計數據
  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => n.status === 'unread').length,
    collaboration: notifications.filter(n => n.type === 'collaboration_opportunity').length,
    wish: notifications.filter(n => n.type === 'wish_opportunity').length,
    meeting: notifications.filter(n => n.type === 'meeting_insights').length,
    market: notifications.filter(n => n.type === 'market_opportunity').length
  };

  useEffect(() => {
    loadMockData();
  }, []);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* 頁面標題 */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AutoAwesomeIcon sx={{ fontSize: 40, color: '#4CAF50' }} />
            AI 智慧合作網絡 - 通知測試
          </Typography>
          <Button 
            variant="contained"
            onClick={loadMockData}
            disabled={loading}
            startIcon={<NotificationsActiveIcon />}
            sx={{ 
              background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
              boxShadow: '0 3px 5px 2px rgba(76, 175, 80, .3)'
            }}
          >
            {loading ? '載入中...' : '重新載入測試數據'}
          </Button>
        </Box>
        <Typography variant="subtitle1" color="text.secondary">
          🤖 AI 智慧通知系統展示 - 體驗個性化的商業機會推薦
        </Typography>
      </Box>

      {loading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress sx={{ borderRadius: 1, height: 6 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
            AI 正在分析您的商業畫像並生成個性化通知...
          </Typography>
        </Box>
      )}

      {/* 統計卡片 */}
      <Fade in={!loading} timeout={1000}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              transform: 'translateY(0)',
              transition: 'transform 0.3s ease',
              '&:hover': { transform: 'translateY(-4px)' }
            }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Badge badgeContent={stats.unread} color="error">
                  <NotificationsActiveIcon sx={{ fontSize: 40 }} />
                </Badge>
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 'bold' }}>
                  {stats.total}
                </Typography>
                <Typography variant="body2">
                  總通知數
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)',
              color: 'white',
              transform: 'translateY(0)',
              transition: 'transform 0.3s ease',
              '&:hover': { transform: 'translateY(-4px)' }
            }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <HandshakeIcon sx={{ fontSize: 40 }} />
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 'bold' }}>
                  {stats.collaboration}
                </Typography>
                <Typography variant="body2">
                  合作機會
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #FF9800 0%, #FFB74D 100%)',
              color: 'white',
              transform: 'translateY(0)',
              transition: 'transform 0.3s ease',
              '&:hover': { transform: 'translateY(-4px)' }
            }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <StarIcon sx={{ fontSize: 40 }} />
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 'bold' }}>
                  {stats.wish}
                </Typography>
                <Typography variant="body2">
                  許願機會
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)',
              color: 'white',
              transform: 'translateY(0)',
              transition: 'transform 0.3s ease',
              '&:hover': { transform: 'translateY(-4px)' }
            }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <AnalyticsIcon sx={{ fontSize: 40 }} />
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 'bold' }}>
                  {stats.meeting}
                </Typography>
                <Typography variant="body2">
                  會議洞察
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%)',
              color: 'white',
              transform: 'translateY(0)',
              transition: 'transform 0.3s ease',
              '&:hover': { transform: 'translateY(-4px)' }
            }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <TrendingUpIcon sx={{ fontSize: 40 }} />
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 'bold' }}>
                  {stats.market}
                </Typography>
                <Typography variant="body2">
                  市場機會
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #FF5722 0%, #FF8A65 100%)',
              color: 'white',
              transform: 'translateY(0)',
              transition: 'transform 0.3s ease',
              '&:hover': { transform: 'translateY(-4px)' }
            }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <PsychologyIcon sx={{ fontSize: 40 }} />
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 'bold' }}>
                  AI
                </Typography>
                <Typography variant="body2">
                  智慧分析
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Fade>

      {/* AI 功能說明 */}
      <Fade in={!loading} timeout={1500}>
        <Alert 
          severity="info" 
          icon={<LightbulbIcon />}
          sx={{ 
            mb: 3,
            background: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)',
            border: '1px solid #2196F3'
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            🤖 AI 智慧通知系統特色
          </Typography>
          <Typography variant="body2">
            • <strong>個性化推薦</strong>：基於您的商業畫像和行為模式，AI 主動發現最適合的合作機會<br/>
            • <strong>智慧匹配</strong>：運用深度學習算法，計算合作潛力評分，提供精準的商業建議<br/>
            • <strong>即時洞察</strong>：分析會議內容、市場趨勢，為您挖掘隱藏的商業價值<br/>
            • <strong>優先級管理</strong>：根據機會重要性和時效性，智慧排序通知優先級
          </Typography>
        </Alert>
      </Fade>

      {/* 通知列表 */}
      <Fade in={!loading} timeout={2000}>
        <Card sx={{ boxShadow: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <NotificationsIcon color="primary" />
              智慧通知列表
              <Chip 
                label={`${stats.unread} 未讀`} 
                color="error" 
                size="small" 
                sx={{ ml: 1 }}
              />
            </Typography>
            
            {notifications.length === 0 ? (
              <Alert severity="info">暫無通知</Alert>
            ) : (
              <List>
                {notifications.map((notification, index) => {
                  const typeConfig = notificationTypes[notification.type];
                  const priorityConfig_ = priorityConfig[notification.priority];
                  
                  return (
                    <Slide 
                      key={`${animationKey}-${notification.id}`}
                      direction="up" 
                      in={true} 
                      timeout={500 + index * 200}
                    >
                      <ListItem 
                        divider
                        sx={{ 
                          bgcolor: notification.status === 'unread' ? typeConfig?.bgColor : 'transparent',
                          cursor: 'pointer',
                          borderRadius: 2,
                          mb: 1,
                          border: notification.status === 'unread' ? `2px solid ${typeConfig?.color}` : '1px solid #e0e0e0',
                          transition: 'all 0.3s ease',
                          '&:hover': { 
                            transform: 'translateX(8px)',
                            boxShadow: 3
                          }
                        }}
                        onClick={() => viewNotificationDetail(notification)}
                      >
                        <ListItemAvatar>
                          <Avatar 
                            sx={{ 
                              bgcolor: typeConfig?.color,
                              width: 56,
                              height: 56
                            }}
                          >
                            {getNotificationIcon(notification.type)}
                          </Avatar>
                        </ListItemAvatar>
                        
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                {notification.title}
                              </Typography>
                              <Chip 
                                label={typeConfig?.label} 
                                size="small" 
                                sx={{ 
                                  bgcolor: typeConfig?.color,
                                  color: 'white',
                                  fontSize: '0.75rem'
                                }}
                              />
                              <Chip 
                                label={priorityConfig_.label} 
                                size="small" 
                                sx={{ 
                                  bgcolor: priorityConfig_.color,
                                  color: 'white',
                                  fontSize: '0.75rem'
                                }}
                              />
                              {notification.matchingScore && (
                                <Chip 
                                  label={`匹配度 ${notification.matchingScore}分`} 
                                  size="small" 
                                  sx={{ 
                                    bgcolor: getScoreColor(notification.matchingScore),
                                    color: 'white',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold'
                                  }}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {notification.content}
                              </Typography>
                              {notification.relatedUser && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <Avatar 
                                    src={notification.relatedUser.avatar}
                                    sx={{ width: 24, height: 24 }}
                                  >
                                    {notification.relatedUser.name[0]}
                                  </Avatar>
                                  <Typography variant="caption" color="primary">
                                    {notification.relatedUser.name} - {notification.relatedUser.company}
                                  </Typography>
                                </Box>
                              )}
                              <Typography variant="caption" color="text.secondary">
                                <ScheduleIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                                {formatDistanceToNow(new Date(notification.createdAt), { 
                                  addSuffix: true, 
                                  locale: zhTW 
                                })}
                                {notification.readAt && (
                                  <CheckCircleIcon sx={{ fontSize: 14, ml: 1, mr: 0.5, verticalAlign: 'middle', color: 'success.main' }} />
                                )}
                              </Typography>
                            </Box>
                          }
                        />
                        
                        <ListItemSecondaryAction>
                          <Tooltip title="查看詳情">
                            <IconButton 
                              edge="end" 
                              onClick={(e) => {
                                e.stopPropagation();
                                viewNotificationDetail(notification);
                              }}
                              sx={{ 
                                bgcolor: typeConfig?.color,
                                color: 'white',
                                '&:hover': { bgcolor: typeConfig?.color, opacity: 0.8 }
                              }}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      </ListItem>
                    </Slide>
                  );
                })}
              </List>
            )}
          </CardContent>
        </Card>
      </Fade>

      {/* 通知詳情對話框 */}
      <Dialog 
        open={openDetailDialog} 
        onClose={() => setOpenDetailDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
          }
        }}
      >
        {selectedNotification && (
          <>
            <DialogTitle sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2,
              background: notificationTypes[selectedNotification.type]?.color,
              color: 'white'
            }}>
              {getNotificationIcon(selectedNotification.type)}
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">{selectedNotification.title}</Typography>
                <Typography variant="caption">
                  {notificationTypes[selectedNotification.type]?.label}
                </Typography>
              </Box>
              <IconButton 
                onClick={() => setOpenDetailDialog(false)}
                sx={{ color: 'white' }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            
            <DialogContent sx={{ mt: 2 }}>
              <Stack spacing={3}>
                {/* 通知內容 */}
                <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    📋 通知內容
                  </Typography>
                  <Typography variant="body1">
                    {selectedNotification.content}
                  </Typography>
                </Paper>

                {/* AI 推薦理由 */}
                {selectedNotification.aiReasoning && (
                  <Paper sx={{ p: 2, bgcolor: '#E8F5E8' }}>
                    <Typography variant="subtitle2" color="success.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PsychologyIcon fontSize="small" />
                      🤖 AI 分析理由
                    </Typography>
                    <Typography variant="body2">
                      {selectedNotification.aiReasoning}
                    </Typography>
                  </Paper>
                )}

                {/* 匹配分數 */}
                {selectedNotification.matchingScore && (
                  <Paper sx={{ p: 2, bgcolor: '#FFF3E0' }}>
                    <Typography variant="subtitle2" color="warning.main" gutterBottom>
                      📊 匹配度分析
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={selectedNotification.matchingScore} 
                        sx={{ 
                          flex: 1, 
                          height: 10, 
                          borderRadius: 5,
                          bgcolor: '#e0e0e0',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: getScoreColor(selectedNotification.matchingScore)
                          }
                        }} 
                      />
                      <Typography variant="h6" sx={{ 
                        color: getScoreColor(selectedNotification.matchingScore),
                        fontWeight: 'bold'
                      }}>
                        {selectedNotification.matchingScore}分
                      </Typography>
                    </Box>
                  </Paper>
                )}

                {/* 相關用戶 */}
                {selectedNotification.relatedUser && (
                  <Paper sx={{ p: 2, bgcolor: '#E3F2FD' }}>
                    <Typography variant="subtitle2" color="info.main" gutterBottom>
                      👤 相關聯絡人
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar 
                        src={selectedNotification.relatedUser.avatar}
                        sx={{ width: 48, height: 48 }}
                      >
                        {selectedNotification.relatedUser.name[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {selectedNotification.relatedUser.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedNotification.relatedUser.company}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                )}

                {/* 相關許願 */}
                {selectedNotification.relatedWish && (
                  <Paper sx={{ p: 2, bgcolor: '#FFF3E0' }}>
                    <Typography variant="subtitle2" color="warning.main" gutterBottom>
                      🎯 相關許願
                    </Typography>
                    <Typography variant="body1">
                      {selectedNotification.relatedWish.title}
                    </Typography>
                  </Paper>
                )}
              </Stack>
            </DialogContent>
            
            <DialogActions sx={{ p: 3 }}>
              <Button 
                variant="contained" 
                sx={{ 
                  background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
                  mr: 1
                }}
              >
                立即聯繫
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => setOpenDetailDialog(false)}
              >
                關閉
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default AINotificationTestPage;