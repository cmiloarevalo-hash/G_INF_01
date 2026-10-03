import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const LOOPBACK_HOST = '127.0.0.1';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function jsonForbidden(res) {
  if (res.headersSent) return;
  res.statusCode = 403;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ error: 'Solicitud local rechazada.' }));
}

export function createPortableGuard(application) {
  let expectedHost = null;
  let expectedOrigin = null;

  return {
    configure(port) {
      if (!Number.isInteger(port) || port <= 0) {
        throw new Error('No se obtuvo un puerto local válido.');
      }
      expectedHost = `${LOOPBACK_HOST}:${port}`;
      expectedOrigin = `http://${expectedHost}`;
      return expectedOrigin;
    },

    handler(req, res) {
      if (!expectedHost || req.headers.host !== expectedHost) {
        jsonForbidden(res);
        return;
      }

      const method = (req.method ?? 'GET').toUpperCase();
      if (MUTATING_METHODS.has(method) && req.headers.origin !== expectedOrigin) {
        jsonForbidden(res);
        return;
      }

      application(req, res);
    },
  };
}

async function resolveServerModuleUrl() {
  const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(scriptDirectory, 'dist', 'server.js'),
    path.resolve(scriptDirectory, '..', '..', 'dist', 'server.js'),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return pathToFileURL(candidate);
    } catch {
      // Try the next supported layout.
    }
  }

  throw new Error('No se encontró dist/server.js para iniciar la aplicación portable.');
}

export async function createPortableApplication() {
  const serverModuleUrl = await resolveServerModuleUrl();
  const { createServerApp, setupApp } = await import(serverModuleUrl.href);
  const application = createServerApp({ env: {} });
  await setupApp(application);
  return application;
}

async function listenOnLoopback(server) {
  await new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(0, LOOPBACK_HOST);
  });

  const address = server.address();
  if (!address || typeof address === 'string' || address.address !== LOOPBACK_HOST || address.port <= 0) {
    throw new Error('El servidor portable no quedó enlazado al loopback esperado.');
  }
  return address;
}

export async function verifyPortableHealth(origin, fetchImpl = fetch, timeoutMs = 5_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${origin}/api/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Health check devolvió HTTP ${response.status}.`);
    }
    const body = await response.json();
    if (body?.status !== 'ok') {
      throw new Error('Health check no confirmó status=ok.');
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

export async function openDefaultWindowsBrowser(url) {
  if (process.platform !== 'win32') {
    throw new Error('El launcher portable sólo abre navegador automáticamente en Windows.');
  }

  await new Promise((resolve, reject) => {
    const command = process.env.ComSpec || 'cmd.exe';
    const child = spawn(command, ['/d', '/s', '/c', 'start', '', url], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });

    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}

export async function closePortableServer(server) {
  if (!server.listening) return;
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function installShutdownHandlers(server, logger) {
  let closing = false;

  const shutdown = async (signal) => {
    if (closing) return;
    closing = true;
    logger.log(`[portable] ${signal}: cerrando servidor local.`);
    try {
      await closePortableServer(server);
    } catch (error) {
      logger.error('[portable] No fue posible cerrar limpiamente el servidor local.', error);
      process.exitCode = 1;
    }
  };

  const onSigint = () => void shutdown('SIGINT');
  const onSigterm = () => void shutdown('SIGTERM');
  process.once('SIGINT', onSigint);
  process.once('SIGTERM', onSigterm);

  return () => {
    process.off('SIGINT', onSigint);
    process.off('SIGTERM', onSigterm);
  };
}

export async function startPortableApp(options = {}) {
  const {
    createApplication = createPortableApplication,
    fetchImpl = fetch,
    openBrowser = openDefaultWindowsBrowser,
    logger = console,
    installSignalHandlers = true,
    healthTimeoutMs = 5_000,
  } = options;

  const application = await createApplication();
  const guard = createPortableGuard(application);
  const server = http.createServer(guard.handler);
  let removeSignalHandlers = () => {};

  try {
    const address = await listenOnLoopback(server);
    const origin = guard.configure(address.port);

    await verifyPortableHealth(origin, fetchImpl, healthTimeoutMs);
    logger.log(`[portable] Health PASS en ${origin}.`);

    await openBrowser(origin);
    logger.log(`[portable] Aplicación disponible en ${origin}.`);

    if (installSignalHandlers) {
      removeSignalHandlers = installShutdownHandlers(server, logger);
    }

    let closed = false;
    const close = async () => {
      if (closed) return;
      closed = true;
      removeSignalHandlers();
      await closePortableServer(server);
    };

    return {
      server,
      origin,
      port: address.port,
      host: address.address,
      close,
    };
  } catch (error) {
    removeSignalHandlers();
    await closePortableServer(server).catch(() => undefined);
    throw error;
  }
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return pathToFileURL(path.resolve(entry)).href === import.meta.url;
}

async function main() {
  const smoke = process.argv.includes('--smoke');
  const runtime = await startPortableApp({
    ...(smoke
      ? {
          installSignalHandlers: false,
          openBrowser: async () => undefined,
        }
      : {}),
  });

  if (smoke) {
    console.log(`PORTABLE_SMOKE_OK host=${runtime.host} port=${runtime.port} health=ok`);
    await runtime.close();
  }
}

if (isDirectRun()) {
  main().catch((error) => {
    console.error('[portable] Inicio fallido:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
