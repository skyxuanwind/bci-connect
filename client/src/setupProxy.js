const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  const targetPort = process.env.API_PORT || process.env.PORT_API || 8000; // default to 8000 in current dev env
  const target = `http://localhost:${targetPort}`;

  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      timeout: 60000,
      proxyTimeout: 60000,
      onError: (err, req, res) => {
        console.error('Proxy error:', err.message);
        res.status(500).send('Proxy error: ' + err.message);
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying request:', req.method, req.url, '-> ' + target + req.url);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('Proxy response:', proxyRes.statusCode, req.url);
      }
    })
  );
};