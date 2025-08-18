const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  console.log('🚀 Setting up proxy middleware...');
  
  const proxyOptions = {
    target: 'http://localhost:5001',
    changeOrigin: true,
    secure: false,
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
      console.log('🔄 Proxying request:', req.method, req.url);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log('✅ Proxy response:', proxyRes.statusCode, 'for', req.method, req.url);
    },
    onError: (err, req, res) => {
      console.error('❌ Proxy error for', req.url, ':', err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Proxy error', message: err.message });
      }
    }
  };
  
  app.use('/api', createProxyMiddleware(proxyOptions));
  
  console.log('✅ Proxy middleware setup complete!');
};