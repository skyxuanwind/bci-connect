import React, { useMemo, useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Grid
} from '@mui/material';

// 預設的分類選項（與 WishesPage 對齊）
export const defaultWishCategories = [
  { value: 'marketing', label: '行銷合作' },
  { value: 'technology', label: '技術合作' },
  { value: 'supply_chain', label: '供應鏈合作' },
  { value: 'investment', label: '投資機會' },
  { value: 'partnership', label: '策略夥伴' },
  { value: 'other', label: '其他' }
];

const emptyForm = {
  title: '',
  description: '',
  category: '',
  priority: 1,
  expiresAt: ''
};

const WishFormDialog = ({
  open,
  onClose,
  onSubmit,
  initialValues,
  submitting = false,
  isEdit = false,
  categories
}) => {
  const categoryOptions = useMemo(() => categories && categories.length ? categories : defaultWishCategories, [categories]);
  const [form, setForm] = useState({ ...emptyForm, ...(initialValues || {}) });

  useEffect(() => {
    setForm({ ...emptyForm, ...(initialValues || {}) });
  }, [initialValues, open]);

  const handleChange = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.description) return;
    await onSubmit?.(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEdit ? '✏️ 編輯許願' : '💡 發布新許願'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <TextField
            fullWidth
            label="許願標題"
            value={form.title}
            onChange={handleChange('title')}
            sx={{ mb: 2 }}
            placeholder="例如：尋找電商行銷合作夥伴"
          />

          <TextField
            fullWidth
            multiline
            rows={4}
            label="詳細描述"
            value={form.description}
            onChange={handleChange('description')}
            sx={{ mb: 2 }}
            placeholder="詳細描述您的需求、目標客群、合作方式等..."
            helperText="AI 將分析您的描述來找到最佳匹配的合作夥伴"
          />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 2, minWidth: { xs: 'auto', sm: 200 } }}>
                <InputLabel id="wish-dialog-category-label" sx={{ whiteSpace: { xs: 'normal', sm: 'nowrap' } }}>分類</InputLabel>
                 <Select
                   value={form.category}
                   onChange={handleChange('category')}
                   label="分類"
                   labelId="wish-dialog-category-label"
                   MenuProps={{
                     PaperProps: {
                       style: {
                         maxHeight: 300,
                         zIndex: 1400
                       }
                     },
                     anchorOrigin: {
                       vertical: 'bottom',
                       horizontal: 'left'
                     },
                     transformOrigin: {
                       vertical: 'top',
                       horizontal: 'left'
                     }
                   }}
                 >
                   {categoryOptions.map((cat) => (
                     <MenuItem key={cat.value} value={cat.value}>
                       {cat.label}
                     </MenuItem>
                   ))}
                 </Select>
               </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 2, minWidth: { xs: 'auto', sm: 180 } }}>
                <InputLabel id="wish-dialog-priority-label" sx={{ whiteSpace: { xs: 'normal', sm: 'nowrap' } }}>優先級</InputLabel>
                 <Select
                   value={form.priority}
                   onChange={handleChange('priority')}
                   label="優先級"
                   labelId="wish-dialog-priority-label"
                   MenuProps={{
                     PaperProps: {
                       style: {
                         maxHeight: 300,
                         zIndex: 1400
                       }
                     },
                     anchorOrigin: {
                       vertical: 'bottom',
                       horizontal: 'left'
                     },
                     transformOrigin: {
                       vertical: 'top',
                       horizontal: 'left'
                     }
                   }}
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
            value={form.expiresAt || ''}
            onChange={handleChange('expiresAt')}
            InputLabelProps={{ shrink: true }}
            helperText="設定許願的有效期限"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          取消
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={!form.title || !form.description || submitting}
        >
          {submitting ? (isEdit ? '更新中...' : '發布中...') : (isEdit ? '更新許願' : '發布許願')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WishFormDialog;