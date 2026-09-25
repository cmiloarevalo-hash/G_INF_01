import express, { type Express } from 'express';
import path from 'node:path';
import { createHash, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { extractGuestDocument, guestDocumentFactsSchema, synthesizeTitleStudy, type GeminiFetch, type GuestDocumentInput } from './src/services/ai/gemini.js';
import * as z from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type AliasEnvironment = Record<string, string | undefined>;
const aliasSlots = [
  { id: 'test-1', label: 'Prueba 1', secret: 'GEMINI_TEST_KEY_1' },
  { id: 'test-2', label: 'Prueba 2', secret: 'GEMINI_TEST_KEY_2' },
  { id: 'test-3', label: 'Prueba 3', secret: 'GEMINI_TEST_KEY_3' },
] as const;

function authorizedAlias(req: express.Request, env: AliasEnvironment): boolean {
  const expected = env.GEMINI_ALIAS_ACCESS_TOKEN;
  const actual = req.header('x-gemini-alias-access-token');
  // Explicit opt-in and a sufficiently long owner capability are both mandatory.
  if (env.GEMINI_ALIAS_MODE !== 'owner-only' || !expected || expected.length < 32 || !actual) return false;
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(expected), digest(actual));
}

function resolveKey(req: express.Request, env: AliasEnvironment): { key?: string; status?: number; error?: string } {
  const temporary = req.header('x-gemini-api-key');
  const alias = req.header('x-gemini-key-alias');
  if (temporary && alias) return { status: 400, error: 'Selecciona una sola fuente de clave.' };
  if (alias) {
    if (!authorizedAlias(req, env)) return { status: 403, error: 'Acceso al alias no autorizado.' };
    const slot = aliasSlots.find((item) => item.id === alias);
    const key = slot && env[slot.secret];
    if (!key?.trim()) return { status: 400, error: 'El alias seleccionado no está configurado.' };
    return { key };
  }
  if (!temporary?.trim()) return { status: 400, error: 'Ingresa tu clave de Gemini para esta sesión.' };
  return { key: temporary };
}

export function createServerApp(options: { fetchImpl?: GeminiFetch; env?: AliasEnvironment } = {}): Express {
  const app = express();
  const fetchImpl = options.fetchImpl ?? fetch;
  const env = options.env ?? process.env;

  // Health check: reports HTTP process availability ONLY (V-003, V-042, NFR-024)
  // Does NOT consult or affirm status of external services (Drive, Firestore, LLM, etc.)
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/guest/key-aliases', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!authorizedAlias(req, env)) return res.status(403).json({ error: 'Acceso a los alias no autorizado.' });
    return res.json({ aliases: aliasSlots.filter((item) => env[item.secret]?.trim()).map(({ id, label }) => ({ id, label })) });
  });

  app.post('/api/guest/extract', express.json({ limit: '101mb' }), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const credential = resolveKey(req, env);
    const inputSchema = z.strictObject({
      id: z.string().min(1), name: z.string().min(1), mimeType: z.string(),
      size: z.number().int().nonnegative(), data: z.string().min(1),
    });
    const parsed = inputSchema.safeParse(req.body);
    if (!credential.key) return res.status(credential.status ?? 400).json({ error: credential.error });
    if (!parsed.success) return res.status(400).json({ error: 'La solicitud del archivo no es válida.' });
    try {
      const extracted = await extractGuestDocument(credential.key, parsed.data as GuestDocumentInput, fetchImpl);
      return res.json(extracted);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error de análisis.';
      const fileProblem = /Formato aún no procesado|firma PDF|extensión de imagen|texto UTF-8|bytes nulos|Supera 70 MiB|máximo técnico de 50 MiB|incompleto/.test(message);
      return res.status(fileProblem ? 422 : 502).json({ error: message, code: fileProblem ? 'FILE_NOT_ANALYZABLE' : 'GEMINI_ERROR' });
    }
  });

  app.post('/api/guest/synthesize', express.json({ limit: '5mb' }), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const credential = resolveKey(req, env);
    const requestSchema = z.strictObject({ extractions: z.array(z.strictObject({
      documentId: z.string().min(1), name: z.string().min(1), extraction: guestDocumentFactsSchema,
    })).min(1) });
    const parsed = requestSchema.safeParse(req.body);
    if (!credential.key) return res.status(credential.status ?? 400).json({ error: credential.error });
    if (!parsed.success) return res.status(400).json({ error: 'No hay extractos válidos para consolidar.' });
    try {
      const report = await synthesizeTitleStudy(credential.key, parsed.data.extractions as Parameters<typeof synthesizeTitleStudy>[1], fetchImpl);
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
