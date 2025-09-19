import React from 'react';

const DressCodeExamples = () => {
  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <h4 className="text-sm font-medium text-gray-900 mb-3">正式服裝範例</h4>
      
      {/* 統一商務服裝範例 */}
      <div className="flex justify-center mb-6">
        <div className="text-center max-w-md">
          <h5 className="text-sm font-medium text-gray-700 mb-3">商務正式服裝</h5>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="mx-auto mb-3 w-64 h-80 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
              <img 
                src="/images/business-attire.jpg"
                alt="商務正式服裝範例"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden w-full h-full bg-gray-200 items-center justify-center text-gray-500 text-sm">
                服裝範例圖片
              </div>
            </div>
            
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
      
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800">
          <strong>重要提醒：</strong>請確保服裝整潔、得體，符合商務場合的專業形象要求。
        </p>
      </div>
    </div>
  );
};

export default DressCodeExamples;