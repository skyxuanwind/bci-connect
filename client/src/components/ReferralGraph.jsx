import React, { useEffect, useRef } from 'react';
import axios from 'axios';

// 動態載入 vis-network 以避免編譯時 ESM/SSR 問題
let VisNetwork;
try {
  VisNetwork = require('vis-network');
} catch (e) {
  VisNetwork = null;
}

export default function ReferralGraph({ type = 'all' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    let networkInstance = null;
    async function loadGraph() {
      try {
        const res = await axios.get('/api/referrals/graph', { params: { type } });
        const { nodes = [], edges = [] } = res.data || {};
        if (!VisNetwork || !containerRef.current) return;
        const data = {
          nodes: new VisNetwork.DataSet(nodes.map(n => ({ id: n.id, label: n.label }))),
          edges: new VisNetwork.DataSet(edges.map(e => ({ from: e.from, to: e.to, value: e.count, title: `總數:${e.count} 已確認:${e.confirmed}` })))
        };
        const options = {
          nodes: { shape: 'dot', size: 16, font: { color: '#f7e6b7' }, color: { background: '#1f2937', border: '#b45309' } },
          edges: { color: { color: '#f59e0b' }, smooth: true },
          physics: { stabilization: true }
        };
        networkInstance = new VisNetwork.Network(containerRef.current, data, options);
      } catch (err) {
        // 靜默失敗，避免阻斷頁面
        console.error('載入引薦圖譜失敗', err);
      }
    }
    loadGraph();
    return () => {
      if (networkInstance) {
        networkInstance.destroy();
      }
    };
  }, [type]);

  return (
    <div className="bg-primary-800 border border-gold-600 rounded-lg p-4">
      <h3 className="text-lg font-medium text-gold-100 mb-2">引薦關係圖譜</h3>
      <div ref={containerRef} style={{ height: 360 }} />
    </div>
  );
}