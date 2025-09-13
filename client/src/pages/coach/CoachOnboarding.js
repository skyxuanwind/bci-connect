import React from 'react';

const CoachOnboarding = () => {
  return (
    <div className="space-y-6">
      <div className="bg-primary-800 border border-gold-600 rounded-lg p-6 shadow-elegant">
        <h1 className="text-2xl font-semibold text-gold-100">教練入職指南</h1>
        <p className="mt-2 text-gold-300">以下內容將協助您快速熟悉教練角色、工具與作業流程。</p>
      </div>

      <div className="bg-primary-800 border border-gold-600 rounded-lg p-6">
        <h2 className="text-xl font-medium text-gold-100">本指南內容</h2>
        <ol className="mt-3 list-decimal list-inside text-gold-300 space-y-2">
          <li>教練的目標與責任</li>
          <li>如何查看與管理您的學員</li>
          <li>會談安排與追蹤紀錄建議</li>
          <li>使用系統工具最佳實務</li>
        </ol>
      </div>
    </div>
  );
};

export default CoachOnboarding;