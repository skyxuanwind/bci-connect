const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  const targetPort = process.env.API_PORT || process.env.PORT_API || 5001; // default to 5001 to match server.js
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
      pathRewrite: (path) => {
        // CRA 會在 app.use('/api', ...) 下移除 '/api' 前綴，導致後端收到 '/users/...'
        // 這裡將其加回，讓後端仍以 '/api/*' 路由匹配
        const rewritten = path.startsWith('/api') ? path : `/api${path}`;
        console.log('Proxy pathRewrite:', path, '->', rewritten);
        return rewritten;
      },
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