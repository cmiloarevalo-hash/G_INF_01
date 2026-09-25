import express, { type Express } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractGuestDocument, guestDocumentFactsSchema, synthesizeTitleStudy, type GeminiFetch, type GuestDocumentInput } from './src/services/ai/gemini.js';
import * as z from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createServerApp(options: { fetchImpl?: GeminiFetch } = {}): Express {
  const app = express();
  const fetchImpl = options.fetchImpl ?? fetch;

  // Health check: reports HTTP process availability ONLY (V-003, V-042, NFR-024)
  // Does NOT consult or affirm status of external services (Drive, Firestore, LLM, etc.)
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/api/guest/extract', express.json({ limit: '101mb' }), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const apiKey = req.header('x-gemini-api-key') ?? '';
    const inputSchema = z.strictObject({
      id: z.string().min(1), name: z.string().min(1), mimeType: z.string(),
      size: z.number().int().nonnegative(), data: z.string().min(1),
    });
    const parsed = inputSchema.safeParse(req.body);
    if (!apiKey.trim()) return res.status(400).json({ error: 'Ingresa tu clave de Gemini para esta sesión.' });
    if (!parsed.success) return res.status(400).json({ error: 'La solicitud del archivo no es válida.' });
    try {
      const extracted = await extractGuestDocument(apiKey, parsed.data as GuestDocumentInput, fetchImpl);
      return res.json(extracted);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error de análisis.';
      const fileProblem = /Formato aún no procesado|firma PDF|extensión de imagen|texto UTF-8|bytes nulos|Supera 70 MiB|máximo técnico de 50 MiB|incompleto/.test(message);
      return res.status(fileProblem ? 422 : 502).json({ error: message, code: fileProblem ? 'FILE_NOT_ANALYZABLE' : 'GEMINI_ERROR' });
    }
  });

  app.post('/api/guest/synthesize', express.json({ limit: '5mb' }), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const apiKey = req.header('x-gemini-api-key') ?? '';
    const requestSchema = z.strictObject({ extractions: z.array(z.strictObject({
      documentId: z.string().min(1), name: z.string().min(1), extraction: guestDocumentFactsSchema,
    })).min(1) });
    const parsed = requestSchema.safeParse(req.body);
    if (!apiKey.trim()) return res.status(400).json({ error: 'Ingresa tu clave de Gemini para esta sesión.' });
    if (!parsed.success) return res.status(400).json({ error: 'No hay extractos válidos para consolidar.' });
    try {
      const report = await synthesizeTitleStudy(apiKey, parsed.data.extractions as Parameters<typeof synthesizeTitleStudy>[1], fetchImpl);
      return res.json({ report });
    } catch (error) {
      return res.status(502).json({ error: error instanceof Error ? error.message : 'Gemini no pudo consolidar el análisis.' });
    }
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
