// Simple Node.js HTTP server for Kubernetes deployment demo
// This application demonstrates:
// - Health check endpoints
// - Graceful shutdown
// - Environment variable configuration
// - Logging best practices

const http = require('http');
const os = require('os');

// Configuration from environment variables
const PORT = process.env.PORT || 8080;
const APP_ENV = process.env.APP_ENV || 'development';
const APP_VERSION = process.env.APP_VERSION || '1.0.0';

// Application state
let isReady = false;
let requestCount = 0;
let startTime = Date.now();

// Simulate app initialization
setTimeout(() => {
  isReady = true;
  console.log(`Application is ready - Version: ${APP_VERSION}, Environment: ${APP_ENV}`);
}, 3000);

// Request handler
const server = http.createServer((req, res) => {
  const timestamp = new Date().toISOString();

  // Log incoming request
  console.log(`${timestamp} ${req.method} ${req.url} - ${req.headers['user-agent']}`);

  // Health check endpoint (for liveness probe)
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: timestamp
    }));
    return;
  }

  // Readiness check endpoint (for readiness probe)
  if (req.url === '/ready' && req.method === 'GET') {
    if (isReady) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ready',
        timestamp: timestamp
      }));
    } else {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'not ready',
        timestamp: timestamp
      }));
    }
    return;
  }

  // Metrics endpoint (for Prometheus)
  if (req.url === '/metrics' && req.method === 'GET') {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const metrics = [
      `# HELP http_requests_total Total number of HTTP requests`,
      `# TYPE http_requests_total counter`,
      `http_requests_total ${requestCount}`,
      ``,
      `# HELP nodejs_app_uptime_seconds Application uptime in seconds`,
      `# TYPE nodejs_app_uptime_seconds gauge`,
      `nodejs_app_uptime_seconds ${uptime}`,
      ``,
      `# HELP nodejs_memory_usage_bytes Memory usage in bytes`,
      `# TYPE nodejs_memory_usage_bytes gauge`,
      `nodejs_memory_usage_bytes{type="rss"} ${process.memoryUsage().rss}`,
      `nodejs_memory_usage_bytes{type="heapTotal"} ${process.memoryUsage().heapTotal}`,
      `nodejs_memory_usage_bytes{type="heapUsed"} ${process.memoryUsage().heapUsed}`,
      `nodejs_memory_usage_bytes{type="external"} ${process.memoryUsage().external}`,
    ].join('\n');

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(metrics);
    return;
  }

  // Info endpoint
  if (req.url === '/info' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      app: 'Simple Kubernetes Demo App',
      version: APP_VERSION,
      environment: APP_ENV,
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      requestCount: requestCount,
      timestamp: timestamp
    }, null, 2));
    return;
  }

  // Root endpoint
  if (req.url === '/' && req.method === 'GET') {
    requestCount++;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Kubernetes Demo App</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 50px auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background-color: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h1 { color: #326CE5; }
            .info { margin: 10px 0; }
            .label { font-weight: bold; }
            code {
              background-color: #f4f4f4;
              padding: 2px 6px;
              border-radius: 3px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚀 Simple Kubernetes Demo App</h1>
            <div class="info"><span class="label">Version:</span> ${APP_VERSION}</div>
            <div class="info"><span class="label">Environment:</span> ${APP_ENV}</div>
            <div class="info"><span class="label">Hostname:</span> <code>${os.hostname()}</code></div>
            <div class="info"><span class="label">Platform:</span> ${os.platform()} (${os.arch()})</div>
            <div class="info"><span class="label">Node.js:</span> ${process.version}</div>
            <div class="info"><span class="label">Uptime:</span> ${Math.floor((Date.now() - startTime) / 1000)} seconds</div>
            <div class="info"><span class="label">Request Count:</span> ${requestCount}</div>
            <div class="info"><span class="label">Timestamp:</span> ${timestamp}</div>
            <h2>Available Endpoints:</h2>
            <ul>
              <li><code>GET /</code> - This page</li>
              <li><code>GET /health</code> - Health check (liveness probe)</li>
              <li><code>GET /ready</code> - Readiness check</li>
              <li><code>GET /info</code> - JSON info</li>
              <li><code>GET /metrics</code> - Prometheus metrics</li>
            </ul>
          </div>
        </body>
      </html>
    `);
    return;
  }

  // 404 Not Found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: 'Not Found',
    path: req.url,
    timestamp: timestamp
  }));
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Environment: ${APP_ENV}`);
  console.log(`Version: ${APP_VERSION}`);
  console.log(`Process ID: ${process.pid}`);
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`);

  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
