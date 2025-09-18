import React from 'react';

const DressCodeExamples = () => {
  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <h4 className="text-sm font-medium text-gray-900 mb-3">正式服裝範例</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 男性正式服裝範例 */}
        <div className="text-center">
          <h5 className="text-sm font-medium text-gray-700 mb-3">男性正式服裝</h5>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="mx-auto mb-3 w-48 h-64 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
              <img 
                src="/images/business-attire-male.jpg" 
                alt="男性正式商務服裝範例"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // 如果JPG載入失敗，嘗試載入SVG
                  e.target.src = '/images/business-attire-male.svg';
                  e.target.className = 'w-full h-full object-contain';
                  e.target.onerror = () => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  };
                }}
              />
              <div className="hidden w-full h-full bg-gradient-to-b from-gray-200 to-gray-300 flex flex-col items-center justify-center text-gray-600">
                <div className="text-4xl mb-2">👔</div>
                <div className="text-xs text-center px-2">
                  男性正式<br/>商務服裝
                </div>
              </div>
            </div>
            
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex items-center justify-center">
                <span className="w-3 h-3 bg-gray-800 rounded mr-2"></span>
                <span>深色西裝</span>
              </div>
              <div className="flex items-center justify-center">
                <span className="w-3 h-3 bg-white border rounded mr-2"></span>
                <span>白色襯衫</span>
              </div>
              <div className="flex items-center justify-center">
                <span className="w-3 h-3 bg-blue-900 rounded mr-2"></span>
                <span>正式領帶</span>
              </div>
              <div className="flex items-center justify-center">
                <span className="w-3 h-3 bg-black rounded mr-2"></span>
                <span>皮鞋</span>
              </div>
            </div>
          </div>
        </div>

        {/* 女性正式服裝範例 */}
        <div className="text-center">
          <h5 className="text-sm font-medium text-gray-700 mb-3">女性正式服裝</h5>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="mx-auto mb-3 w-48 h-64 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
              <img 
                src="/images/business-attire-female.jpg" 
                alt="女性正式商務服裝範例"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // 如果JPG載入失敗，嘗試載入SVG
                  e.target.src = '/images/business-attire-female.svg';
                  e.target.className = 'w-full h-full object-contain';
                  e.target.onerror = () => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  };
                }}
              />
              <div className="hidden w-full h-full bg-gradient-to-b from-gray-200 to-gray-300 flex flex-col items-center justify-center text-gray-600">
                <div className="text-4xl mb-2">👗</div>
                <div className="text-xs text-center px-2">
                  女性正式<br/>商務服裝
                </div>
              </div>
            </div>
            
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex items-center justify-center">
                <span className="w-3 h-3 bg-blue-900 rounded mr-2"></span>
                <span>正式套裝</span>
              </div>
              <div className="flex items-center justify-center">
                <span className="w-3 h-3 bg-white border rounded mr-2"></span>
                <span>白色襯衫</span>
              </div>
              <div className="flex items-center justify-center">
                <span className="w-3 h-3 bg-gray-800 rounded mr-2"></span>
                <span>正式裙裝或褲裝</span>
              </div>
              <div className="flex items-center justify-center">
                <span className="w-3 h-3 bg-black rounded mr-2"></span>
                <span>正式鞋履</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 補充說明 */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h6 className="text-sm font-medium text-blue-900 mb-2">服裝要求重點</h6>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• 請穿著正式服裝（襯衫、西裝、洋裝、皮鞋等）</li>
          <li>• 務必配戴Pin章及名牌</li>
          <li>• 服裝應整潔、合身、專業</li>
          <li>• 避免過於休閒或花俏的服飾</li>
        </ul>
      </div>
    </div>
  );
};

export default DressCodeExamples;