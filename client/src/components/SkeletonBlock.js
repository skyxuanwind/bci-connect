import React from 'react';

export default function SkeletonBlock({ lines = 6, className = '' }) {
  const arr = Array.from({ length: Math.max(1, lines) });
  return (
    <div className={`animate-pulse space-y-2 ${className}`}>
      {arr.map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded" />
      ))}
    </div>
  );
}