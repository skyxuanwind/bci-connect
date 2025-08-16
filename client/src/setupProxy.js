const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5001',
      changeOrigin: true,
      logLevel: 'debug',
      timeout: 30000,
      proxyTimeout: 30000,
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying request:', req.method, req.url, 'to', proxyReq.path);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('Proxy response:', proxyRes.statusCode, 'for', req.method, req.url);
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err.message);
        console.error('Request URL:', req.url);
        console.error('Target:', 'http://localhost:5001' + req.url);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Proxy error', message: err.message });
        }
      }
    })
  );
};