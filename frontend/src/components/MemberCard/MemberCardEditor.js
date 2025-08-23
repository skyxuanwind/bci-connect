import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  Divider,
  Tabs,
  Tab,
  Skeleton,
  Snackbar
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  DragIndicator,
  Preview,
  Save,
  ContentCopy,
  Palette,
  BarChart,
  CloudUpload,
  Link as LinkIcon,
  TextFields,
  Image,
  VideoLibrary,
  Share
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2)
}));

const ContentBlockCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  cursor: 'grab',
  '&:hover': {
    boxShadow: theme.shadows[4]
  }
}));

const TemplateCard = styled(Card)(({ theme, selected }) => ({
  cursor: 'pointer',
  border: selected ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
  transition: 'all 0.2s ease',
  '&:hover': {
    boxShadow: theme.shadows[4],
    transform: 'translateY(-2px)'
  }
}));

const TabPanel = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const MemberCardEditor = () => {
  const [tabValue, setTabValue] = useState(0);
  const [card, setCard] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Dialog states
  const [blockDialog, setBlockDialog] = useState({ open: false, block: null, type: 'add' });
  const [previewDialog, setPreviewDialog] = useState(false);
  
  // Form states
  const [blockForm, setBlockForm] = useState({
    blockType: 'text',
    title: '',
    content: '',
    url: '',
    socialPlatform: 'facebook',
    isVisible: true
  });

  useEffect(() => {
    fetchCardData();
    fetchStats();
  }, []);

  const fetchCardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/member-cards/my-card');
      
      if (response.data.success) {
        setCard(response.data.card);
        setTemplates(response.data.templates);
      }
    } catch (error) {
      console.error('獲取電子名片失敗:', error);
      showSnackbar('載入電子名片時發生錯誤', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/member-cards/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('獲取統計資料失敗:', error);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleTemplateChange = async (templateId) => {
    try {
      setSaving(true);
      await axios.put('/api/member-cards/template', { templateId });
      
      setCard(prev => ({ ...prev, templateId }));
      showSnackbar('模板更新成功');
    } catch (error) {
      console.error('更新模板失敗:', error);
      showSnackbar('更新模板時發生錯誤', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlock = () => {
    setBlockForm({
      blockType: 'text',
      title: '',
      content: '',
      url: '',
      socialPlatform: 'facebook',
      isVisible: true
    });
    setBlockDialog({ open: true, block: null, type: 'add' });
  };

  const handleEditBlock = (block) => {
    setBlockForm({
      blockType: block.block_type,
      title: block.title || '',
      content: block.content || '',
      url: block.url || '',
      socialPlatform: block.social_platform || 'facebook',
      isVisible: block.is_visible
    });
    setBlockDialog({ open: true, block, type: 'edit' });
  };

  const handleSaveBlock = async () => {
    try {
      setSaving(true);
      
      if (blockDialog.type === 'add') {
        const response = await axios.post('/api/member-cards/content-block', blockForm);
        if (response.data.success) {
          setCard(prev => ({
            ...prev,
            contentBlocks: [...prev.contentBlocks, response.data.block]
          }));
          showSnackbar('內容區塊新增成功');
        }
      } else {
        const response = await axios.put(
          `/api/member-cards/content-block/${blockDialog.block.id}`,
          blockForm
        );
        if (response.data.success) {
          setCard(prev => ({
            ...prev,
            contentBlocks: prev.contentBlocks.map(block =>
              block.id === blockDialog.block.id ? response.data.block : block
            )
          }));
          showSnackbar('內容區塊更新成功');
        }
      }
      
      setBlockDialog({ open: false, block: null, type: 'add' });
    } catch (error) {
      console.error('儲存內容區塊失敗:', error);
      showSnackbar('儲存內容區塊時發生錯誤', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlock = async (blockId) => {
    if (!window.confirm('確定要刪除此內容區塊嗎？')) return;
    
    try {
      setSaving(true);
      await axios.delete(`/api/member-cards/content-block/${blockId}`);
      
      setCard(prev => ({
        ...prev,
        contentBlocks: prev.contentBlocks.filter(block => block.id !== blockId)
      }));
      showSnackbar('內容區塊刪除成功');
    } catch (error) {
      console.error('刪除內容區塊失敗:', error);
      showSnackbar('刪除內容區塊時發生錯誤', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    
    const items = Array.from(card.contentBlocks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setCard(prev => ({ ...prev, contentBlocks: items }));
    
    try {
      const blockIds = items.map(item => item.id);
      await axios.put('/api/member-cards/reorder-blocks', { blockIds });
      showSnackbar('區塊順序更新成功');
    } catch (error) {
      console.error('更新區塊順序失敗:', error);
      showSnackbar('更新區塊順序時發生錯誤', 'error');
      // Revert on error
      fetchCardData();
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      setSaving(true);
      const response = await axios.post('/api/member-cards/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        setBlockForm(prev => ({ ...prev, imageUrl: response.data.imageUrl }));
        showSnackbar('圖片上傳成功');
      }
    } catch (error) {
      console.error('圖片上傳失敗:', error);
      showSnackbar('圖片上傳時發生錯誤', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyUrl = async () => {
    const url = `${window.location.origin}/member/${JSON.parse(localStorage.getItem('user')).id}`;
    try {
      await navigator.clipboard.writeText(url);
      showSnackbar('網址已複製到剪貼簿');
    } catch (error) {
      console.error('複製網址失敗:', error);
      showSnackbar('複製網址時發生錯誤', 'error');
    }
  };

  const handlePreview = () => {
    const userId = JSON.parse(localStorage.getItem('user')).id;
    window.open(`/member/${userId}`, '_blank');
  };

  const getBlockIcon = (type) => {
    switch (type) {
      case 'text': return <TextFields />;
      case 'link': return <LinkIcon />;
      case 'image': return <Image />;
      case 'video': return <VideoLibrary />;
      case 'social': return <Share />;
      default: return <TextFields />;
    }
  };

  const getBlockTypeLabel = (type) => {
    const labels = {
      text: '文字',
      link: '連結',
      image: '圖片',
      video: '影片',
      social: '社群'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Skeleton variant="rectangular" height={400} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={300} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <StyledPaper>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" gutterBottom>
            電子名片編輯器
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<ContentCopy />}
              onClick={handleCopyUrl}
            >
              複製網址
            </Button>
            <Button
              variant="contained"
              startIcon={<Preview />}
              onClick={handlePreview}
            >
              預覽名片
            </Button>
          </Box>
        </Box>
        
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="內容編輯" icon={<Edit />} />
          <Tab label="模板設計" icon={<Palette />} />
          <Tab label="統計資料" icon={<BarChart />} />
        </Tabs>
      </StyledPaper>

      {/* Content Editing Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <StyledPaper>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">內容區塊</Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleAddBlock}
                >
                  新增區塊
                </Button>
              </Box>
              
              {card?.contentBlocks?.length === 0 ? (
                <Alert severity="info">
                  還沒有任何內容區塊，點擊「新增區塊」開始建立您的電子名片內容。
                </Alert>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="content-blocks">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef}>
                        {card?.contentBlocks?.map((block, index) => (
                          <Draggable key={block.id} draggableId={block.id.toString()} index={index}>
                            {(provided) => (
                              <ContentBlockCard
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                              >
                                <CardContent>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <div {...provided.dragHandleProps}>
                                      <DragIndicator color="action" />
                                    </div>
                                    
                                    {getBlockIcon(block.block_type)}
                                    
                                    <Box sx={{ flexGrow: 1 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <Chip
                                          label={getBlockTypeLabel(block.block_type)}
                                          size="small"
                                          color="primary"
                                        />
                                        {!block.is_visible && (
                                          <Chip label="隱藏" size="small" color="default" />
                                        )}
                                      </Box>
                                      
                                      <Typography variant="subtitle1" gutterBottom>
                                        {block.title || '無標題'}
                                      </Typography>
                                      
                                      {block.content && (
                                        <Typography variant="body2" color="text.secondary" noWrap>
                                          {block.content}
                                        </Typography>
                                      )}
                                    </Box>
                                    
                                    <Box>
                                      <IconButton
                                        onClick={() => handleEditBlock(block)}
                                        color="primary"
                                      >
                                        <Edit />
                                      </IconButton>
                                      <IconButton
                                        onClick={() => handleDeleteBlock(block.id)}
                                        color="error"
                                      >
                                        <Delete />
                                      </IconButton>
                                    </Box>
                                  </Box>
                                </CardContent>
                              </ContentBlockCard>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </StyledPaper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Template Design Tab */}
      <TabPanel value={tabValue} index={1}>
        <StyledPaper>
          <Typography variant="h6" gutterBottom>
            選擇視覺模板
          </Typography>
          <Grid container spacing={2}>
            {templates.map((template) => (
              <Grid item xs={12} sm={6} md={4} key={template.id}>
                <TemplateCard
                  selected={card?.templateId === template.id}
                  onClick={() => handleTemplateChange(template.id)}
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {template.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {template.description}
                    </Typography>
                  </CardContent>
                </TemplateCard>
              </Grid>
            ))}
          </Grid>
        </StyledPaper>
      </TabPanel>

      {/* Statistics Tab */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary" gutterBottom>
                  {stats?.view_count || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  總瀏覽次數
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary" gutterBottom>
                  {stats?.unique_visitors || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  獨立訪客
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary" gutterBottom>
                  {stats?.visits_last_7_days || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  近7天瀏覽
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary" gutterBottom>
                  {stats?.visits_last_30_days || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  近30天瀏覽
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Content Block Dialog */}
      <Dialog
        open={blockDialog.open}
        onClose={() => setBlockDialog({ open: false, block: null, type: 'add' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {blockDialog.type === 'add' ? '新增內容區塊' : '編輯內容區塊'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>區塊類型</InputLabel>
                  <Select
                    value={blockForm.blockType}
                    onChange={(e) => setBlockForm(prev => ({ ...prev, blockType: e.target.value }))}
                    label="區塊類型"
                  >
                    <MenuItem value="text">文字</MenuItem>
                    <MenuItem value="link">連結</MenuItem>
                    <MenuItem value="image">圖片</MenuItem>
                    <MenuItem value="video">影片</MenuItem>
                    <MenuItem value="social">社群</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="標題"
                  value={blockForm.title}
                  onChange={(e) => setBlockForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </Grid>
              
              {(blockForm.blockType === 'text' || blockForm.blockType === 'image') && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="內容"
                    multiline
                    rows={3}
                    value={blockForm.content}
                    onChange={(e) => setBlockForm(prev => ({ ...prev, content: e.target.value }))}
                  />
                </Grid>
              )}
              
              {(blockForm.blockType === 'link' || blockForm.blockType === 'video' || blockForm.blockType === 'social') && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="網址"
                    value={blockForm.url}
                    onChange={(e) => setBlockForm(prev => ({ ...prev, url: e.target.value }))}
                  />
                </Grid>
              )}
              
              {blockForm.blockType === 'social' && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>社群平台</InputLabel>
                    <Select
                      value={blockForm.socialPlatform}
                      onChange={(e) => setBlockForm(prev => ({ ...prev, socialPlatform: e.target.value }))}
                      label="社群平台"
                    >
                      <MenuItem value="facebook">Facebook</MenuItem>
                      <MenuItem value="instagram">Instagram</MenuItem>
                      <MenuItem value="linkedin">LinkedIn</MenuItem>
                      <MenuItem value="twitter">Twitter</MenuItem>
                      <MenuItem value="youtube">YouTube</MenuItem>
                      <MenuItem value="line">LINE</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
              
              {blockForm.blockType === 'image' && (
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<CloudUpload />}
                    fullWidth
                  >
                    上傳圖片
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </Button>
                </Grid>
              )}
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={blockForm.isVisible}
                      onChange={(e) => setBlockForm(prev => ({ ...prev, isVisible: e.target.checked }))}
                    />
                  }
                  label="顯示此區塊"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlockDialog({ open: false, block: null, type: 'add' })}>
            取消
          </Button>
          <Button
            onClick={handleSaveBlock}
            variant="contained"
            disabled={saving}
          >
            {saving ? '儲存中...' : '儲存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MemberCardEditor;