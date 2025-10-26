import React from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function LinksPage() {
  const { memberId } = useParams();
  const LINKS = [
    { title: 'Instagram', url: 'https://instagram.com/example' },
    { title: 'YouTube', url: 'https://youtube.com/@example' },
    { title: 'TikTok', url: 'https://tiktok.com/@example' },
    { title: 'Website', url: 'https://example.com' },
  ];

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
          <h1 className="text-xl font-semibold">Links</h1>
          <div className="text-xs opacity-70">Member #{memberId}</div>
        </motion.div>
        <div className="mt-4 space-y-3">
          {LINKS.map((l, i) => (
            <motion.a key={i} href={l.url} target="_blank" rel="noreferrer"
              className="block px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
            >
              <div className="font-medium">{l.title}</div>
              <div className="text-xs opacity-70">{l.url}</div>
            </motion.a>
          ))}
        </div>
      </div>
    </motion.div>
  );
}