import React from 'react';

/**
 * FlowParticlesLayer 流動粒子層
 * - 在卡片展開時以輕量 CSS 動畫呈現斜向漂移的微粒子
 * - 依裝置效能與使用者偏好自動調節數量
 */
export default function FlowParticlesLayer({ active = true, intensity = 'medium' }) {
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const deviceMemory = typeof navigator !== 'undefined' && navigator.deviceMemory ? navigator.deviceMemory : 4;
  const cores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;

  // 基數量：高 24 / 中 16 / 低 8，再依裝置效能調節
  const baseCount = intensity === 'high' ? 24 : intensity === 'low' ? 8 : 16;
  const perfFactor = (Math.min(deviceMemory, 8) / 8 + Math.min(cores, 8) / 8) / 2; // 0.5 ~ 1
  const count = Math.max(6, Math.round(baseCount * perfFactor));

  const particles = React.useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const angle = 100 + Math.random() * 20; // 斜向角度（度）
      const speed = 9 + Math.random() * 6; // 秒
      const size = 1 + Math.random() * 2; // px
      const opacity = 0.15 + Math.random() * 0.25;
      arr.push({
        left: `${Math.random() * 96 + 2}%`,
        top: `${Math.random() * 96 + 2}%`,
        animationDelay: `${Math.random() * 2000}ms`,
        animationDuration: `${speed}s`,
        angle,
        size,
        opacity,
      });
    }
    return arr;
  }, [count]);

  if (!active || prefersReducedMotion) return null;

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {particles.map((p, idx) => (
        <span
          key={idx}
          className="flow-particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animationDelay: p.animationDelay,
            animationDuration: p.animationDuration,
            ['--flow-angle']: `${p.angle}deg`,
          }}
        />
      ))}
    </div>
  );
}