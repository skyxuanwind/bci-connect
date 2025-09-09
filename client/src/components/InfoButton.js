import React, { useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

const InfoButton = ({ tooltip, className = '' }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        className="w-5 h-5 bg-gradient-to-r from-gray-800 to-black border border-gold-400/30 rounded-sm flex items-center justify-center hover:from-gold-900 hover:to-black hover:border-gold-400/60 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gold-400/50 shadow-lg"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
      >
        <InformationCircleIcon className="h-3 w-3 text-gold-400 hover:text-gold-300 transition-colors duration-200" />
      </button>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gradient-to-br from-gray-900 to-black text-gold-100 text-sm rounded-lg p-3 shadow-2xl border border-gold-500/30 z-50 backdrop-blur-sm">
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          {tooltip}
        </div>
      )}
    </div>
  );
};

export default InfoButton;