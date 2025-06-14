const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let wsManager = null;

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize WebSocket manager after server is created
  server.on('listening', async () => {
    try {
      // TODO: WebSocket manager initialization
      // const { initializeWebSocketManager } = await import('./src/lib/websocket.ts');
      // wsManager = initializeWebSocketManager(server);
      console.log('[SERVER] WebSocket manager skipped for now');
    } catch (error) {
      console.error('[SERVER] Failed to initialize WebSocket manager:', error);
    }
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[SERVER] Shutting down gracefully...');
    if (wsManager) {
      wsManager.shutdown();
    }
    server.close(() => {
      console.log('[SERVER] Server closed');
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    console.log('\n[SERVER] Received SIGTERM, shutting down gracefully...');
    if (wsManager) {
      wsManager.shutdown();
    }
    server.close(() => {
      console.log('[SERVER] Server closed');
      process.exit(0);
    });
  });
});
