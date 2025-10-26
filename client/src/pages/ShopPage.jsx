import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function ShopPage() {
  const { memberId } = useParams();
  const [cart, setCart] = useState([]);
  const PRODUCTS = [
    { id: 'p1', title: '品牌攝影方案', price: 12999 },
    { id: 'p2', title: '個人形象照套組', price: 4999 },
    { id: 'p3', title: '工作坊票券', price: 1999 },
  ];
  const addToCart = (p) => setCart(prev => [...prev, p]);

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 text-white"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="max-w-md mx-auto p-6">
        <motion.div className="text-center" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <h1 className="text-xl font-semibold">Shop</h1>
          <div className="text-xs opacity-70">Member #{memberId}</div>
        </motion.div>
        <div className="mt-4 space-y-3">
          {PRODUCTS.map((p, i) => (
            <motion.div key={p.id} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
            >
              <div>
                <div className="font-medium">{p.title}</div>
                <div className="text-xs opacity-70">NT${p.price.toLocaleString()}</div>
              </div>
              <button onClick={() => addToCart(p)} className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-sm">加入購物車</button>
            </motion.div>
          ))}
        </div>
        <motion.div className="mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <div className="text-sm opacity-80">購物車：{cart.length} 件</div>
        </motion.div>
      </div>
    </motion.div>
  );
}