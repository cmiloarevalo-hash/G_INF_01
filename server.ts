import express, { type Express } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createServerApp(): Express {
  const app = express();

  // Health check: reports HTTP process availability ONLY (V-003, V-042, NFR-024)
  // Does NOT consult or affirm status of external services (Drive, Firestore, LLM, etc.)
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}

export async function setupApp(app: Express): Promise<Express> {
  const isServerTs = process.argv[1]?.endsWith('.ts') || process.argv[1]?.includes('tsx');
  const isProduction = process.env.NODE_ENV === 'production' || !isServerTs;

  const repoRoot = __dirname.endsWith('dist') ? path.resolve(__dirname, '..') : __dirname;
  const clientDistPath = path.resolve(repoRoot, 'dist', 'client');

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: repoRoot,
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(clientDistPath));
    app.use((_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  return app;
}

export async function startServer() {
  const app = createServerApp();
  await setupApp(app);

  const isServerTs = process.argv[1]?.endsWith('.ts') || process.argv[1]?.includes('tsx');
  const isProduction = process.env.NODE_ENV === 'production' || !isServerTs;
  const port = Number(process.env.PORT) || 3000;
  const host = '0.0.0.0';

  const server = app.listen(port, host, () => {
    const mode = isProduction ? 'production' : 'development';
    console.log(`Server listening on http://${host}:${port} (${mode})`);
  });

  return server;
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'));

if (isDirectRun) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
