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
            <svg
              width="120"
              height="200"
              viewBox="0 0 120 200"
              className="mx-auto mb-3"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* 頭部 */}
              <circle cx="60" cy="25" r="15" fill="#F4C2A1" stroke="#E8B088" strokeWidth="1"/>
              
              {/* 頭髮 */}
              <path d="M45 15 Q60 5 75 15 Q75 20 60 25 Q45 20 45 15" fill="#4A4A4A"/>
              
              {/* 西裝外套 */}
              <rect x="35" y="40" width="50" height="80" rx="5" fill="#2D3748"/>
              
              {/* 襯衫 */}
              <rect x="40" y="45" width="40" height="70" fill="#FFFFFF"/>
              
              {/* 領帶 */}
              <rect x="55" y="45" width="10" height="50" fill="#1A365D"/>
              
              {/* 西裝褲 */}
              <rect x="40" y="120" width="40" height="60" fill="#2D3748"/>
              
              {/* 皮鞋 */}
              <ellipse cx="50" cy="190" rx="12" ry="6" fill="#1A1A1A"/>
              <ellipse cx="70" cy="190" rx="12" ry="6" fill="#1A1A1A"/>
              
              {/* 手臂 */}
              <rect x="25" y="50" width="10" height="40" fill="#2D3748"/>
              <rect x="85" y="50" width="10" height="40" fill="#2D3748"/>
              
              {/* 手 */}
              <circle cx="30" cy="95" r="5" fill="#F4C2A1"/>
              <circle cx="90" cy="95" r="5" fill="#F4C2A1"/>
              
              {/* 腿 */}
              <rect x="45" y="180" width="8" height="15" fill="#2D3748"/>
              <rect x="67" y="180" width="8" height="15" fill="#2D3748"/>
            </svg>
            
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
            <svg
              width="120"
              height="200"
              viewBox="0 0 120 200"
              className="mx-auto mb-3"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* 頭部 */}
              <circle cx="60" cy="25" r="15" fill="#F4C2A1" stroke="#E8B088" strokeWidth="1"/>
              
              {/* 頭髮 */}
              <path d="M45 15 Q60 5 75 15 Q80 25 75 35 Q60 30 45 35 Q40 25 45 15" fill="#8B4513"/>
              
              {/* 西裝外套/洋裝 */}
              <path d="M35 40 L85 40 Q85 45 80 50 L80 120 Q75 125 60 125 Q45 125 40 120 L40 50 Q35 45 35 40" fill="#1A365D"/>
              
              {/* 襯衫/內搭 */}
              <rect x="40" y="45" width="40" height="30" fill="#FFFFFF"/>
              
              {/* 裙子或褲子 */}
              <path d="M40 120 L80 120 Q85 125 85 140 L85 160 Q80 165 60 165 Q40 165 35 160 L35 140 Q35 125 40 120" fill="#2D3748"/>
              
              {/* 高跟鞋 */}
              <path d="M45 185 Q50 190 55 185 L55 190 Q50 195 45 190 Z" fill="#1A1A1A"/>
              <path d="M65 185 Q70 190 75 185 L75 190 Q70 195 65 190 Z" fill="#1A1A1A"/>
              
              {/* 手臂 */}
              <rect x="25" y="50" width="10" height="35" fill="#1A365D"/>
              <rect x="85" y="50" width="10" height="35" fill="#1A365D"/>
              
              {/* 手 */}
              <circle cx="30" cy="90" r="5" fill="#F4C2A1"/>
              <circle cx="90" cy="90" r="5" fill="#F4C2A1"/>
              
              {/* 腿 */}
              <rect x="45" y="165" width="6" height="20" fill="#F4C2A1"/>
              <rect x="69" y="165" width="6" height="20" fill="#F4C2A1"/>
            </svg>
            
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