import React from 'react';

const DressCodeExamples = () => {
  return (
    <div className="mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
      <h4 className="text-sm font-medium text-gray-900 mb-3">正式服裝範例</h4>
      
      {/* 統一商務服裝範例 - 響應式佈局 */}
      <div className="mb-4 sm:mb-6">
        <h5 className="text-sm font-medium text-gray-700 mb-3 text-center sm:text-left">商務正式服裝</h5>
        <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border">
          {/* 手機端：左右分佈佈局，桌面端：居中佈局 */}
          <div className="flex flex-col sm:flex-row sm:justify-center gap-3 sm:gap-4">
            {/* 圖片區域 */}
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <div className="w-32 h-40 sm:w-48 sm:h-60 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                <img 
                  src="/images/business-attire.jpg"
                  alt="商務正式服裝範例"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="hidden w-full h-full bg-gray-200 items-center justify-center text-gray-500 text-xs sm:text-sm">
                  服裝範例圖片
                </div>
              </div>
            </div>
            
            {/* 文字內容區域 */}
            <div className="flex-1 sm:max-w-xs">
              <div className="text-left space-y-2">
                <h6 className="text-xs font-medium text-gray-800 mb-2">服裝要求：</h6>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• 正式西裝或套裝</li>
                  <li>• 整潔的襯衫或上衣</li>
                  <li>• 適當的領帶或配飾</li>
                  <li>• 正式皮鞋</li>
                  <li>• 整體搭配協調</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800">
          <strong>重要提醒：</strong>請確保服裝整潔、得體，符合商務場合的專業形象要求。
        </p>
      </div>
    </div>
  );
};

export default DressCodeExamples;