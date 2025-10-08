import React from 'react';

/**
 * SparkleLayer 星光粒子層
 * - 輕量絢光點，強度依設備性能與偏好自動調整
 * - 使用 CSS 動畫，避免 JS 重排造成性能負擔
 */
export default function SparkleLayer({ active = true, intensity = 'medium' }) {
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const deviceMemory = typeof navigator !== 'undefined' && navigator.deviceMemory ? navigator.deviceMemory : 4;
  const cores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;

  const baseCount = intensity === 'high' ? 18 : intensity === 'low' ? 6 : 10;
  const perfFactor = (Math.min(deviceMemory, 8) / 8 + Math.min(cores, 8) / 8) / 2; // 0.5 ~ 1
  const count = Math.max(4, Math.round(baseCount * perfFactor));

  const dots = React.useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        left: `${Math.random() * 96 + 2}%`,
        top: `${Math.random() * 96 + 2}%`,
        animationDelay: `${Math.random() * 1200}ms`,
        animationDuration: `${1200 + Math.random() * 1200}ms`,
      });
    }
    return arr;
  }, [count]);

  if (!active || prefersReducedMotion) return null;

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {dots.map((d, idx) => (
        <span
          key={idx}
          className="sparkle-dot"
          style={{ left: d.left, top: d.top, animationDelay: d.animationDelay, animationDuration: d.animationDuration }}
        />
      ))}
    </div>
  );
}