import React from 'react';

export default function SkeletonList({ rows = 5, className = '' }) {
  const arr = Array.from({ length: Math.max(1, rows) });
  return (
    <ul className={`animate-pulse space-y-2 ${className}`}>
      {arr.map((_, i) => (
        <li key={i} className="h-4 bg-gray-200 rounded" />
      ))}
    </ul>
  );
}