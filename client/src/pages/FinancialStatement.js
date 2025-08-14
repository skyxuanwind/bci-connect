import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const FinancialStatement = () => {
  const { user, isAdmin } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [statistics, setStatistics] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netIncome: 0,
    incomeCount: 0,
    expenseCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: ''
  });
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    item_name: '',
    type: 'income',
    amount: '',
    notes: ''
  });

  // 安全地處理數字轉換
  const safeNumber = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // 獲取交易數據
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.type) queryParams.append('type', filters.type);

      const response = await axios.get(`/api/transactions?${queryParams}`);
      
      if (response.data && response.data.success) {
        const transactionsData = Array.isArray(response.data.transactions) ? response.data.transactions : [];
        const statsData = response.data.statistics || {};
        
        setTransactions(transactionsData);
        setStatistics({
          totalIncome: safeNumber(statsData.totalIncome),
          totalExpense: safeNumber(statsData.totalExpense),
          netIncome: safeNumber(statsData.netIncome),
          incomeCount: safeNumber(statsData.incomeCount),
          expenseCount: safeNumber(statsData.expenseCount)
        });
      } else {
        throw new Error('獲取數據失敗');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('獲取交易記錄失敗，請稍後再試');
      setTransactions([]);
      setStatistics({
        totalIncome: 0,
        totalExpense: 0,
        netIncome: 0,
        incomeCount: 0,
        expenseCount: 0
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // 處理表單提交
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      // 驗證表單數據
      if (!formData.date || !formData.item_name || !formData.amount) {
        setError('請填寫所有必填欄位');
        return;
      }
      
      if (safeNumber(formData.amount) <= 0) {
        setError('金額必須大於0');
        return;
      }
      
      const submitData = {
        date: formData.date,
        item_name: formData.item_name.trim(),
        type: formData.type,
        amount: safeNumber(formData.amount),
        notes: formData.notes.trim()
      };
      
      let response;
      if (editingTransaction) {
        response = await axios.put(`/api/transactions/${editingTransaction.id}`, submitData);
      } else {
        response = await axios.post('/api/transactions', submitData);
      }
      
      if (response.data && response.data.success) {
        setSuccess(editingTransaction ? '交易記錄更新成功' : '交易記錄新增成功');
        handleCloseModal();
        fetchTransactions();
      } else {
        throw new Error(response.data?.message || '操作失敗');
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      setError(error.response?.data?.message || '保存失敗，請稍後再試');
    }
  };

  // 刪除交易
  const handleDelete = async (id) => {
    if (!window.confirm('確定要刪除這筆交易嗎？')) return;
    
    try {
      setError('');
      const response = await axios.delete(`/api/transactions/${id}`);
      
      if (response.data && response.data.success) {
        setSuccess('交易記錄刪除成功');
        fetchTransactions();
      } else {
        throw new Error(response.data?.message || '刪除失敗');
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      setError(error.response?.data?.message || '刪除失敗，請稍後再試');
    }
  };

  // 編輯交易
  const handleEdit = (transaction) => {
    if (!transaction) return;
    
    setEditingTransaction(transaction);
    setFormData({
      date: transaction.date ? transaction.date.split('T')[0] : new Date().toISOString().split('T')[0],
      item_name: transaction.item_name || '',
      type: transaction.type || 'income',
      amount: transaction.amount ? transaction.amount.toString() : '',
      notes: transaction.notes || ''
    });
    setShowAddModal(true);
  };

  // 關閉模態框
  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingTransaction(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      item_name: '',
      type: 'income',
      amount: '',
      notes: ''
    });
    setError('');
    setSuccess('');
  };

  // 重置篩選器
  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      type: ''
    });
  };

  // 檢查用戶權限
  const canManageTransactions = () => {
    return user && (user.membershipLevel === 1 || isAdmin());
  };

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('zh-TW');
    } catch {
      return '-';
    }
  };

  // 格式化金額
  const formatAmount = (amount) => {
    return `NT$ ${safeNumber(amount).toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">財務收支表</h1>
          <p className="mt-2 text-gray-600">管理和查看財務收支狀況</p>
        </div>

        {/* 錯誤和成功訊息 */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        {/* 篩選器 */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">開始日期</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">結束日期</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">類型</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部</option>
                <option value="income">收入</option>
                <option value="expense">支出</option>
              </select>
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                重置
              </button>
              {canManageTransactions() && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  新增交易
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">總收入</p>
                <p className="text-2xl font-bold text-green-600">{formatAmount(statistics.totalIncome)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">總支出</p>
                <p className="text-2xl font-bold text-red-600">{formatAmount(statistics.totalExpense)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">淨收益</p>
                <p className={`text-2xl font-bold ${statistics.netIncome >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {formatAmount(statistics.netIncome)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">總筆數</p>
                <p className="text-2xl font-bold text-purple-600">{statistics.incomeCount + statistics.expenseCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 交易記錄列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">交易記錄</h2>
          </div>
          
          {transactions.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">目前沒有交易記錄</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日期</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">項目</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">類型</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金額</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">備註</th>
                    {canManageTransactions() && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => {
                    if (!transaction || !transaction.id) return null;
                    
                    return (
                      <tr key={transaction.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(transaction.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.item_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            transaction.type === 'income' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.type === 'income' ? '收入' : '支出'}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatAmount(transaction.amount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {transaction.notes || '-'}
                        </td>
                        {canManageTransactions() && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleEdit(transaction)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              編輯
                            </button>
                            <button
                              onClick={() => handleDelete(transaction.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              刪除
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 新增/編輯交易模態框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingTransaction ? '編輯交易' : '新增交易'}
              </h3>
              
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">日期 *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">項目名稱 *</label>
                  <input
                    type="text"
                    value={formData.item_name}
                    onChange={(e) => setFormData({...formData, item_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="請輸入項目名稱"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">類型</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="income">收入</option>
                    <option value="expense">支出</option>
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">金額 *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="請輸入金額"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">備註</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                    placeholder="請輸入備註（選填）"
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {editingTransaction ? '更新' : '新增'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialStatement;