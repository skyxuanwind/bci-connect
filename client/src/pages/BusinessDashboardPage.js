import React from 'react';
import AIProfilePage from './AIProfilePage';

/**
 * 我的商業儀表板 - 獨立主頁
 * 重用 AIProfilePage 組件，專門顯示 myBusiness 分頁內容
 */
const BusinessDashboardPage = () => {
  return (
    <AIProfilePage standaloneTab="myBusiness" />
  );
};

export default BusinessDashboardPage;