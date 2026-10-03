import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  access,
  copyFile,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PORTABLE_NAME = 'G_INF_01_Portable-win-x64';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..', '..');

const SENSITIVE_ENV_PREFIXES = ['VITE_FIREBASE_', 'VITE_GOOGLE_', 'GEMINI_TEST_KEY_'];
const SENSITIVE_ENV_KEYS = new Set([
  'GEMINI_ALIAS_ACCESS_TOKEN',
  'GEMINI_ALIAS_MODE',
]);

export function sanitizePortableEnvironment(source = process.env) {
  const clean = { ...source };
  for (const key of Object.keys(clean)) {
    if (
      SENSITIVE_ENV_KEYS.has(key) ||
      SENSITIVE_ENV_PREFIXES.some((prefix) => key.startsWith(prefix))
    ) {
      delete clean[key];
    }
  }
  return clean;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repositoryRoot,
    env: options.env ?? process.env,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    timeout: options.timeout,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const details = options.capture
      ? `\nstdout:\n${result.stdout ?? ''}\nstderr:\n${result.stderr ?? ''}`
      : '';
    throw new Error(`${command} ${args.join(' ')} falló con código ${result.status}.${details}`);
  }
  return result;
}

async function firstExisting(paths) {
  for (const candidate of paths) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try next.
    }
  }
  return null;
}

async function directorySize(target) {
  const info = await stat(target);
  if (info.isFile()) return info.size;

  let total = 0;
  for (const entry of await readdir(target, { withFileTypes: true })) {
    total += await directorySize(path.join(target, entry.name));
  }
  return total;
}

async function sha256(target) {
  const hash = createHash('sha256');
  const bytes = await readFile(target);
  hash.update(bytes);
  return hash.digest('hex');
}

async function assertPortableLayout(root) {
  const required = [
    'Start.cmd',
    'README_LOCAL.txt',
    'BUILD_INFO.txt',
    path.join('runtime', 'node.exe'),
    path.join('runtime', 'LICENSE'),
    path.join('app', 'package.json'),
    path.join('app', 'package-lock.json'),
    path.join('app', 'portable-launcher.mjs'),
    path.join('app', 'node_modules'),
    path.join('app', 'dist', 'server.js'),
    path.join('app', 'dist', 'client', 'index.html'),
    path.join('app', 'dist', 'src', 'report-types', 'title-study', 'prompt.md'),
  ];

  for (const relative of required) {
    await access(path.join(root, relative));
  }

  const productionModules = await readdir(path.join(root, 'app', 'node_modules'));
  if (productionModules.length === 0) {
    throw new Error('El staging no contiene node_modules de producción.');
  }
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

async function gitHead() {
  return run('git', ['rev-parse', 'HEAD'], { capture: true }).stdout.trim();
}

async function writeArtifactDocs(artifactRoot, version, commitSha) {
  const readme = [
    'G_INF_01 - Aplicación portable Windows x64',
    '',
    'Uso:',
    '1. Mantén toda esta carpeta junta.',
    '2. Haz doble clic en Start.cmd.',
    '3. Espera a que el navegador predeterminado se abra.',
    '4. Usa la clave Gemini temporal sólo cuando la aplicación la solicite.',
    '5. Para cerrar limpiamente el servidor local, vuelve a la consola y presiona Ctrl+C.',
    '',
    'No requiere Node, npm, permisos de administrador ni instalación en el PC destino.',
    'El servicio escucha sólo en 127.0.0.1 con un puerto dinámico.',
    'No contiene claves Gemini, credenciales Firebase ni secretos de Google.',
    '',
  ].join('\r\n');

  const buildInfo = [
    'repository=cmiloarevalo-hash/G_INF_01',
    `git_sha=${commitSha}`,
    `app_version=${version}`,
    `node_version=${process.version}`,
    `platform=${process.platform}`,
    `arch=${process.arch}`,
    `built_at=${new Date().toISOString()}`,
    'package_format=portable-folder-v1',
    '',
  ].join('\r\n');

  await writeFile(path.join(artifactRoot, 'README_LOCAL.txt'), readme, 'utf8');
  await writeFile(path.join(artifactRoot, 'BUILD_INFO.txt'), buildInfo, 'utf8');
}

async function findNodeLicense() {
  const nodeDirectory = path.dirname(process.execPath);
  const license = await firstExisting([
    path.join(nodeDirectory, 'LICENSE'),
    path.join(nodeDirectory, 'LICENSE.txt'),
    path.resolve(nodeDirectory, '..', 'LICENSE'),
    path.resolve(nodeDirectory, '..', 'LICENSE.txt'),
  ]);
  if (!license) {
    throw new Error('No se encontró la licencia del runtime Node junto al ejecutable.');
  }
  return license;
}

export async function packageWindowsPortable() {
  if (process.platform !== 'win32' || process.arch !== 'x64') {
    throw new Error('El paquete portable debe construirse en Windows x64.');
  }

  const packageJson = JSON.parse(
    await readFile(path.join(repositoryRoot, 'package.json'), 'utf8'),
  );
  const cleanEnv = sanitizePortableEnvironment(process.env);

  run(npmCommand(), ['run', 'build'], {
    env: {
      ...cleanEnv,
      NODE_ENV: 'production',
    },
  });

  const outputRoot = path.join(repositoryRoot, 'portable-out');
  const artifactRoot = path.join(outputRoot, PORTABLE_NAME);
  const appRoot = path.join(artifactRoot, 'app');
  const runtimeRoot = path.join(artifactRoot, 'runtime');
  const zipPath = path.join(outputRoot, `${PORTABLE_NAME}.zip`);

  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(appRoot, { recursive: true });
  await mkdir(runtimeRoot, { recursive: true });

  await copyFile(
    path.join(repositoryRoot, 'package.json'),
    path.join(appRoot, 'package.json'),
  );
  await copyFile(
    path.join(repositoryRoot, 'package-lock.json'),
    path.join(appRoot, 'package-lock.json'),
  );

  run(npmCommand(), ['ci', '--omit=dev', '--no-audit', '--no-fund'], {
    cwd: appRoot,
    env: {
      ...cleanEnv,
      NODE_ENV: 'production',
    },
  });

  await cp(path.join(repositoryRoot, 'dist'), path.join(appRoot, 'dist'), {
    recursive: true,
  });
  await copyFile(
    path.join(repositoryRoot, 'scripts', 'local', 'portable-launcher.mjs'),
    path.join(appRoot, 'portable-launcher.mjs'),
  );
  await copyFile(
    path.join(repositoryRoot, 'scripts', 'local', 'Start.cmd'),
    path.join(artifactRoot, 'Start.cmd'),
  );

  await copyFile(process.execPath, path.join(runtimeRoot, 'node.exe'));
  const nodeLicense = await findNodeLicense();
  await copyFile(nodeLicense, path.join(runtimeRoot, 'LICENSE'));

  const commitSha = await gitHead();
  await writeArtifactDocs(artifactRoot, packageJson.version, commitSha);
  await assertPortableLayout(artifactRoot);

  const smoke = run(
    'cmd.exe',
    ['/d', '/s', '/c', 'Start.cmd'],
    {
      cwd: artifactRoot,
      capture: true,
      env: {
        ...cleanEnv,
        NODE_ENV: 'production',
        G_INF_PORTABLE_SMOKE: '1',
      },
      timeout: 30_000,
    },
  );

  if (!smoke.stdout.includes('PORTABLE_SMOKE_OK')) {
    throw new Error(`Start.cmd + runtime incluido no confirmaron el smoke test.\n${smoke.stdout}`);
  }

  await rm(zipPath, { force: true });
  const psPath = artifactRoot.replaceAll("'", "''");
  const psZip = zipPath.replaceAll("'", "''");
  run(
    'powershell.exe',
    [
      '-NoLogo',
      '-NoProfile',
      '-Command',
      `Compress-Archive -LiteralPath '${psPath}' -DestinationPath '${psZip}' -Force`,
    ],
    { timeout: 120_000 },
  );

  const folderBytes = await directorySize(artifactRoot);
  const zipBytes = (await stat(zipPath)).size;
  const zipSha256 = await sha256(zipPath);

  console.log('PORTABLE_SMOKE=PASS');
  console.log(`PORTABLE_FOLDER_BYTES=${folderBytes}`);
  console.log(`PORTABLE_ZIP_BYTES=${zipBytes}`);
  console.log(`PORTABLE_ZIP_SHA256=${zipSha256}`);
  console.log(`PORTABLE_FOLDER=${artifactRoot}`);
  console.log(`PORTABLE_ZIP=${zipPath}`);

  return {
    artifactRoot,
    zipPath,
    folderBytes,
    zipBytes,
    zipSha256,
    commitSha,
  };
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return pathToFileURL(path.resolve(entry)).href === import.meta.url;
}

if (isDirectRun()) {
  packageWindowsPortable().catch((error) => {
    console.error(
      '[portable-package] Error:',
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  });
}
