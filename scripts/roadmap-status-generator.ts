import type {
  RoadmapChildSnapshot,
  RoadmapMetaSnapshot,
  RoadmapSnapshot,
  RoadmapSourceReference,
  RoadmapStatus,
} from '../src/shared/roadmapStatus.js';

export interface GitHubRoadmapIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  body: string | null;
  html_url: string;
  pull_request?: unknown;
}

interface ChildDefinition {
  id: string;
  label: string;
}

interface MetaDefinition {
  id: string;
  label: string;
  children?: ChildDefinition[];
  legacyIssueNumber?: number;
}

const META_DEFINITIONS: MetaDefinition[] = [
  { id: 'M1', label: 'Análisis invitado de una llamada', legacyIssueNumber: 12 },
  {
    id: 'M2',
    label: 'Publicación comprobada del piloto',
    children: [
      { id: 'M2.1', label: 'Preparar la versión' },
      { id: 'M2.2', label: 'Configurar acceso seguro' },
      { id: 'M2.3', label: 'Publicar y probar' },
      { id: 'M2.4', label: 'Registrar y decidir' },
    ],
  },
  {
    id: 'M3',
    label: 'Resultado e informe para invitado',
    children: [
      { id: 'M3.1', label: 'Contrato de presentación' },
      { id: 'M3.2', label: 'Vista web enriquecida TITLE_STUDY' },
      { id: 'M3.3', label: 'Renderer y descarga DOCX' },
      { id: 'M3.4', label: 'Verificación integrada y revisión humana' },
    ],
  },
  { id: 'M4', label: 'Trabajo persistente y capacidades completas' },
  { id: 'M5', label: 'Integración del producto completo' },
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
}

function findIssueByPrefix(issues: GitHubRoadmapIssue[], id: string) {
  const prefix = new RegExp('^' + escapeRegExp(id) + '\\s*:', 'i');
  return issues.find((issue) => prefix.test(issue.title));
}

function sourceForIssue(
  issue: GitHubRoadmapIssue,
  kind: RoadmapSourceReference['kind'] = 'issue',
): RoadmapSourceReference {
  return { issueNumber: issue.number, url: issue.html_url, kind };
}

function statusFromIssue(issue: GitHubRoadmapIssue | undefined): RoadmapStatus {
  if (!issue) return 'PENDIENTE';
  return issue.state === 'closed' ? 'OK' : 'EN PROCESO';
}

function checklistStatus(body: string | null, id: string): boolean | null {
  if (!body) return null;
  for (const line of body.split('\n')) {
    const match = line.match(/^\s*-\s*\[([ xX])\]\s*(.+)$/);
    if (!match || !match[2]?.includes(id)) continue;
    return match[1]?.toLowerCase() === 'x';
  }
  return null;
}

function resolveChild(
  issues: GitHubRoadmapIssue[],
  parentIssue: GitHubRoadmapIssue | undefined,
  definition: ChildDefinition,
): RoadmapChildSnapshot {
  const dedicatedIssue = findIssueByPrefix(issues, definition.id);
  if (dedicatedIssue) {
    return {
      id: definition.id,
      label: definition.label,
      status: statusFromIssue(dedicatedIssue),
      source: sourceForIssue(dedicatedIssue),
    };
  }

  const checked = checklistStatus(parentIssue?.body ?? null, definition.id);
  if (checked !== null && parentIssue) {
    return {
      id: definition.id,
      label: definition.label,
      status: checked ? 'OK' : 'PENDIENTE',
      source: sourceForIssue(parentIssue, 'checklist'),
    };
  }

  return { id: definition.id, label: definition.label, status: 'PENDIENTE' };
}

function resolveMeta(
  issues: GitHubRoadmapIssue[],
  definition: MetaDefinition,
): RoadmapMetaSnapshot {
  const metaIssue = definition.legacyIssueNumber
    ? issues.find((issue) => issue.number === definition.legacyIssueNumber)
    : findIssueByPrefix(issues, definition.id);

  if (!definition.children?.length) {
    return {
      id: definition.id,
      label: definition.label,
      status: statusFromIssue(metaIssue),
      pointsEarned: metaIssue?.state === 'closed' ? 20 : 0,
      pointsMax: 20,
      ...(metaIssue
        ? { source: sourceForIssue(metaIssue, definition.legacyIssueNumber ? 'legacy' : 'issue') }
        : {}),
    };
  }

  const children = definition.children.map((child) => resolveChild(issues, metaIssue, child));
  const completed = children.filter((child) => child.status === 'OK').length;
  const pointsEarned = Number(((20 / children.length) * completed).toFixed(2));
  const status: RoadmapStatus = completed === children.length
    ? 'OK'
    : metaIssue || children.some((child) => child.status !== 'PENDIENTE')
      ? 'EN PROCESO'
      : 'PENDIENTE';

  return {
    id: definition.id,
    label: definition.label,
    status,
    pointsEarned,
    pointsMax: 20,
    children,
    ...(metaIssue ? { source: sourceForIssue(metaIssue) } : {}),
  };
}

export function computeRoadmapSnapshot(
  issues: GitHubRoadmapIssue[],
  sourceSha: string,
  generatedAt: string,
): RoadmapSnapshot {
  const canonicalIssues = issues.filter((issue) => !issue.pull_request);
  const metas = META_DEFINITIONS.map((definition) => resolveMeta(canonicalIssues, definition));
  const overallPercent = Number(metas.reduce((sum, meta) => sum + meta.pointsEarned, 0).toFixed(2));
  const earned = metas
    .filter((meta) => meta.pointsEarned > 0)
    .map((meta) => meta.id + ' ' + meta.pointsEarned)
    .join(' + ');

  return {
    schemaVersion: 1,
    generatedAt,
    sourceSha,
    overallPercent,
    summary: overallPercent + '% ponderado' + (earned ? ': ' + earned : ''),
    metas,
  };
}

export function renderMachineIssueBody(snapshot: RoadmapSnapshot) {
  return [
    '# Machine-generated roadmap status',
    '',
    'This Issue is a machine-readable status endpoint for the in-app roadmap panel.',
    '',
    'It is **not a Work Item** and does not authorize implementation.',
    '',
    'Source-of-truth remains the canonical roadmap/meta Issues and repository documentation.',
    'This generated payload is updated by the dedicated roadmap-status Action.',
    '',
    'Do not edit the generated payload manually.',
    '',
    '<!-- ROADMAP_STATUS_JSON_START -->',
    JSON.stringify(snapshot, null, 2),
    '<!-- ROADMAP_STATUS_JSON_END -->',
    '',
  ].join('\n');
}

async function apiJson<T>(url: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: 'Bearer ' + token,
      'x-github-api-version': '2022-11-28',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error('GitHub API ' + response.status + ' for ' + url);
  }

  return response.json() as Promise<T>;
}

async function fetchAllIssues(apiUrl: string, repository: string, token: string) {
  const collected: GitHubRoadmapIssue[] = [];
  for (let page = 1; ; page += 1) {
    const batch = await apiJson<GitHubRoadmapIssue[]>(
      apiUrl + '/repos/' + repository + '/issues?state=all&per_page=100&page=' + page,
      token,
    );
    collected.push(...batch.filter((issue) => !issue.pull_request));
    if (batch.length < 100) break;
  }
  return collected;
}

async function updateMachineIssue() {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const apiUrl = process.env.GITHUB_API_URL ?? 'https://api.github.com';

  if (!repository || !token) {
    throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are required.');
  }

  const [issues, mainCommit] = await Promise.all([
    fetchAllIssues(apiUrl, repository, token),
    apiJson<{ sha: string }>(apiUrl + '/repos/' + repository + '/commits/main', token),
  ]);

  const snapshot = computeRoadmapSnapshot(issues, mainCommit.sha, new Date().toISOString());
  const body = renderMachineIssueBody(snapshot);

  await apiJson(
    apiUrl + '/repos/' + repository + '/issues/43',
    token,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body }),
    },
  );

  process.stdout.write(
    'Roadmap snapshot updated: ' + snapshot.overallPercent + '% @ ' + snapshot.sourceSha + '\n',
  );
}

if (process.argv.includes('--update-issue')) {
  updateMachineIssue().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
