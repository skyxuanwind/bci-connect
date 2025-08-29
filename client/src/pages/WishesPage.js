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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  Alert,
  Skeleton,
  Fab,
  IconButton,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  Tab,
  Tabs
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';

const WishesPage = () => {
  const { user } = useAuth();
  const [wishes, setWishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: 'active',
    userId: ''
  });
  const [tabValue, setTabValue] = useState(0);
  const [openWishDialog, setOpenWishDialog] = useState(false);
  const [editingWish, setEditingWish] = useState(null);
  const [selectedWish, setSelectedWish] = useState(null);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [matchingResults, setMatchingResults] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuWishId, setMenuWishId] = useState(null);
  
  // 許願表單狀態
  const [wishForm, setWishForm] = useState({
    title: '',
    description: '',
    category: '',
    tags: [],
    priority: 1,
    expiresAt: ''
  });
  const [submittingWish, setSubmittingWish] = useState(false);

  // 分類選項
  const categories = [
    { value: 'marketing', label: '行銷合作' },
    { value: 'technology', label: '技術合作' },
    { value: 'supply_chain', label: '供應鏈合作' },
    { value: 'investment', label: '投資機會' },
    { value: 'partnership', label: '策略夥伴' },
    { value: 'other', label: '其他' }
  ];

  // 載入許願列表
  const loadWishes = async (page = 1) => {
    try {
      setLoading(true);
      
      const params = {
        page,
        limit: 12,
        ...filters
      };

      // 根據標籤頁調整篩選
      if (tabValue === 1) {
        params.userId = user.id; // 我的許願
      } else if (tabValue === 0) {
        delete params.userId; // 全部許願
      }

      const response = await api.get('/api/wishes', { params });
      
      if (response.data.success) {
        setWishes(response.data.data.wishes);
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      console.error('載入許願失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  // 搜尋許願
  const handleSearch = async () => {
    if (!filters.search.trim()) {
      loadWishes(1);
      return;
    }

    try {
      setLoading(true);
      
      const response = await api.post('/api/wishes/search', {
        query: filters.search,
        filters: {
          category: filters.category,
          limit: 12
        }
      });
      
      if (response.data.success) {
        setWishes(response.data.data.wishes);
        setPagination({ page: 1, totalPages: 1, total: response.data.data.totalResults });
      }
    } catch (error) {
      console.error('搜尋許願失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  // 創建或更新許願
  const handleSubmitWish = async () => {
    try {
      setSubmittingWish(true);
      
      const url = editingWish ? `/api/wishes/${editingWish.id}` : '/api/wishes';
      const method = editingWish ? 'put' : 'post';
      
      const response = await api[method](url, wishForm);
      
      if (response.data.success) {
        setOpenWishDialog(false);
        setEditingWish(null);
        setWishForm({ title: '', description: '', category: '', tags: [], priority: 1, expiresAt: '' });
        loadWishes(pagination.page);
      }
    } catch (error) {
      console.error('提交許願失敗:', error);
    } finally {
      setSubmittingWish(false);
    }
  };

  // 刪除許願
  const handleDeleteWish = async (wishId) => {
    if (!window.confirm('確定要刪除這個許願嗎？')) {
      return;
    }

    try {
      await api.delete(`/api/wishes/${wishId}`);
      loadWishes(pagination.page);
      setAnchorEl(null);
    } catch (error) {
      console.error('刪除許願失敗:', error);
    }
  };

  // 查看許願詳情
  const handleViewWishDetail = async (wish) => {
    try {
      setSelectedWish(wish);
      
      // 載入匹配結果
      if (wish.user.id === user.id) {
        const response = await api.get(`/api/wishes/${wish.id}/matches`);
        if (response.data.success) {
          setMatchingResults(response.data.data.matches);
        }
      }
      
      setOpenDetailDialog(true);
    } catch (error) {
      console.error('載入許願詳情失敗:', error);
      setOpenDetailDialog(true);
    }
  };

  // 編輯許願
  const handleEditWish = (wish) => {
    setEditingWish(wish);
    setWishForm({
      title: wish.title,
      description: wish.description,
      category: wish.category || '',
      tags: wish.tags || [],
      priority: wish.priority,
      expiresAt: wish.expiresAt ? wish.expiresAt.split('T')[0] : ''
    });
    setOpenWishDialog(true);
    setAnchorEl(null);
  };

  // 處理選單
  const handleMenuClick = (event, wishId) => {
    setAnchorEl(event.currentTarget);
    setMenuWishId(wishId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuWishId(null);
  };

  // 獲取優先級顏色
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 3: return 'error';
      case 2: return 'warning';
      default: return 'info';
    }
  };

  // 獲取分類標籤
  const getCategoryLabel = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.label : category;
  };

  useEffect(() => {
    loadWishes();
  }, [tabValue, filters.category, filters.status]);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* 頁面標題 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          💡 會員許願版
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          發布您的商業需求，讓AI為您找到最佳合作夥伴
        </Typography>
      </Box>

      {/* 標籤頁 */}
      <Box sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="全部許願" />
          <Tab label="我的許願" />
        </Tabs>
      </Box>

      {/* 搜尋和篩選 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="搜尋許願內容..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>分類</InputLabel>
                <Select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  label="分類"
                >
                  <MenuItem value="">全部</MenuItem>
                  {categories.map(cat => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>狀態</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  label="狀態"
                >
                  <MenuItem value="active">進行中</MenuItem>
                  <MenuItem value="completed">已完成</MenuItem>
                  <MenuItem value="cancelled">已取消</MenuItem>
                  <MenuItem value="all">全部</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button 
                fullWidth
                variant="contained" 
                onClick={handleSearch}
                startIcon={<SearchIcon />}
              >
                搜尋
              </Button>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button 
                fullWidth
                variant="outlined" 
                onClick={() => setOpenWishDialog(true)}
                startIcon={<AddIcon />}
              >
                發布許願
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 許願列表 */}
      {loading ? (
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
      ) : wishes.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <PsychologyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {filters.search ? '沒有找到相關許願' : '還沒有許願'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {filters.search ? '試試調整搜尋條件' : '成為第一個發布許願的人！'}
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => setOpenWishDialog(true)}
            startIcon={<AddIcon />}
          >
            發布許願
          </Button>
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {wishes.map((wish) => (
              <Grid item xs={12} md={6} lg={4} key={wish.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flex: 1 }}>
                    {/* 標題和操作選單 */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" component="h3" sx={{ flex: 1, mr: 1 }}>
                        {wish.title}
                      </Typography>
                      {wish.user.id === user.id && (
                        <IconButton 
                          size="small"
                          onClick={(e) => handleMenuClick(e, wish.id)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      )}
                    </Box>

                    {/* 描述 */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {wish.description.length > 150 
                        ? `${wish.description.substring(0, 150)}...` 
                        : wish.description
                      }
                    </Typography>

                    {/* 標籤 */}
                    <Box sx={{ mb: 2 }}>
                      {wish.category && (
                        <Chip 
                          size="small" 
                          label={getCategoryLabel(wish.category)}
                          color="primary"
                          variant="outlined"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      )}
                      <Chip 
                        size="small" 
                        label={`優先級 ${wish.priority}`}
                        color={getPriorityColor(wish.priority)}
                        sx={{ mr: 1, mb: 1 }}
                      />
                      {wish.extractedIntents && wish.extractedIntents.collaborationType && (
                        <Chip 
                          size="small" 
                          label={`🤖 ${wish.extractedIntents.collaborationType}`}
                          color="secondary"
                          variant="outlined"
                          sx={{ mb: 1 }}
                        />
                      )}
                    </Box>

                    {/* AI 分析結果 */}
                    {wish.extractedIntents && (
                      <Box sx={{ 
                        bgcolor: 'primary.50', 
                        p: 1, 
                        borderRadius: 1, 
                        border: '1px solid',
                        borderColor: 'primary.200',
                        mb: 2
                      }}>
                        <Typography variant="caption" color="primary.main">
                          🤖 AI 識別：
                          {wish.extractedIntents.businessType && ` ${wish.extractedIntents.businessType}`}
                          {wish.extractedIntents.targetMarket && ` • ${wish.extractedIntents.targetMarket}`}
                        </Typography>
                      </Box>
                    )}

                    {/* 發布者信息 */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar 
                        src={wish.user.profilePicture} 
                        sx={{ width: 32, height: 32, mr: 1 }}
                      >
                        {wish.user.name.charAt(0)}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {wish.user.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {wish.user.company} • {wish.user.industry}
                        </Typography>
                      </Box>
                    </Box>

                    {/* 時間信息 */}
                    <Typography variant="caption" color="text.secondary">
                      發布於 {formatDistanceToNow(new Date(wish.createdAt), { 
                        addSuffix: true, 
                        locale: zhTW 
                      })}
                    </Typography>
                  </CardContent>

                  {/* 操作按鈕 */}
                  <Box sx={{ p: 2, pt: 0 }}>
                    <Button 
                      fullWidth
                      variant="outlined"
                      onClick={() => handleViewWishDetail(wish)}
                      startIcon={<VisibilityIcon />}
                    >
                      查看詳情
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* 分頁 */}
          {pagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination 
                count={pagination.totalPages}
                page={pagination.page}
                onChange={(e, page) => loadWishes(page)}
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
          const wish = wishes.find(w => w.id === menuWishId);
          if (wish) handleEditWish(wish);
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>編輯</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDeleteWish(menuWishId)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>刪除</ListItemText>
        </MenuItem>
      </Menu>

      {/* 許願表單對話框 */}
      <Dialog 
        open={openWishDialog} 
        onClose={() => {
          setOpenWishDialog(false);
          setEditingWish(null);
          setWishForm({ title: '', description: '', category: '', tags: [], priority: 1, expiresAt: '' });
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingWish ? '✏️ 編輯許願' : '💡 發布新許願'}
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
              helperText="AI 將分析您的描述來找到最佳匹配的合作夥伴"
            />
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>分類</InputLabel>
                  <Select
                    value={wishForm.category}
                    onChange={(e) => setWishForm(prev => ({ ...prev, category: e.target.value }))}
                    label="分類"
                  >
                    {categories.map(cat => (
                      <MenuItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
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
              </Grid>
            </Grid>
            
            <TextField
              fullWidth
              type="date"
              label="到期日期（可選）"
              value={wishForm.expiresAt}
              onChange={(e) => setWishForm(prev => ({ ...prev, expiresAt: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              helperText="設定許願的有效期限"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenWishDialog(false);
            setEditingWish(null);
            setWishForm({ title: '', description: '', category: '', tags: [], priority: 1, expiresAt: '' });
          }}>
            取消
          </Button>
          <Button 
            onClick={handleSubmitWish}
            variant="contained"
            disabled={!wishForm.title || !wishForm.description || submittingWish}
          >
            {submittingWish ? (editingWish ? '更新中...' : '發布中...') : (editingWish ? '更新許願' : '發布許願')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 許願詳情對話框 */}
      <Dialog 
        open={openDetailDialog} 
        onClose={() => {
          setOpenDetailDialog(false);
          setSelectedWish(null);
          setMatchingResults([]);
        }}
        maxWidth="lg"
        fullWidth
      >
        {selectedWish && (
          <>
            <DialogTitle>
              💡 {selectedWish.title}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  {/* 許願詳情 */}
                  <Typography variant="body1" paragraph>
                    {selectedWish.description}
                  </Typography>
                  
                  {/* 標籤 */}
                  <Box sx={{ mb: 3 }}>
                    {selectedWish.category && (
                      <Chip 
                        label={getCategoryLabel(selectedWish.category)}
                        color="primary"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    )}
                    <Chip 
                      label={`優先級 ${selectedWish.priority}`}
                      color={getPriorityColor(selectedWish.priority)}
                      sx={{ mr: 1, mb: 1 }}
                    />
                  </Box>

                  {/* AI 分析結果 */}
                  {selectedWish.extractedIntents && (
                    <Card variant="outlined" sx={{ mb: 3 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          🤖 AI 分析結果
                        </Typography>
                        <Grid container spacing={2}>
                          {selectedWish.extractedIntents.businessType && (
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2">
                                <strong>業務類型：</strong>{selectedWish.extractedIntents.businessType}
                              </Typography>
                            </Grid>
                          )}
                          {selectedWish.extractedIntents.collaborationType && (
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2">
                                <strong>合作類型：</strong>{selectedWish.extractedIntents.collaborationType}
                              </Typography>
                            </Grid>
                          )}
                          {selectedWish.extractedIntents.targetMarket && (
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2">
                                <strong>目標市場：</strong>{selectedWish.extractedIntents.targetMarket}
                              </Typography>
                            </Grid>
                          )}
                          {selectedWish.extractedIntents.urgency && (
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2">
                                <strong>緊急程度：</strong>{selectedWish.extractedIntents.urgency}
                              </Typography>
                            </Grid>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>
                  )}
                </Grid>

                <Grid item xs={12} md={4}>
                  {/* 發布者信息 */}
                  <Card variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar 
                          src={selectedWish.user.profilePicture} 
                          sx={{ width: 48, height: 48, mr: 2 }}
                        >
                          {selectedWish.user.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="h6">
                            {selectedWish.user.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {selectedWish.user.company}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {selectedWish.user.industry}
                          </Typography>
                        </Box>
                      </Box>
                      
                      {selectedWish.user.id !== user.id && (
                        <Button fullWidth variant="contained">
                          發起面談
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  {/* 匹配結果（僅許願發布者可見） */}
                  {selectedWish.user.id === user.id && matchingResults.length > 0 && (
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          🎯 AI 推薦匹配
                        </Typography>
                        {matchingResults.slice(0, 3).map((match) => (
                          <Box key={match.member.id} sx={{ mb: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <Avatar 
                                src={match.member.profilePicture} 
                                sx={{ width: 32, height: 32, mr: 1 }}
                              >
                                {match.member.name.charAt(0)}
                              </Avatar>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" fontWeight="medium">
                                  {match.member.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {match.member.company}
                                </Typography>
                              </Box>
                              <Chip 
                                size="small" 
                                label={`${match.score}%`}
                                color="primary"
                              />
                            </Box>
                            {match.reasoning && (
                              <Typography variant="caption" color="text.secondary">
                                🤖 {match.reasoning}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => {
                setOpenDetailDialog(false);
                setSelectedWish(null);
                setMatchingResults([]);
              }}>
                關閉
              </Button>
            </DialogActions>
          </>
        )}
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
    </Container>
  );
};

export default WishesPage;