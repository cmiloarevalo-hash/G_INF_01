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

interface MetaDefinition {
  id: string;
  label: string;
  legacyIssueNumber?: number;
}

interface PlannedChild {
  id: string;
  label?: string;
  checked?: boolean;
}

const META_DEFINITIONS: MetaDefinition[] = [
  { id: 'M1', label: 'Análisis invitado de una llamada', legacyIssueNumber: 12 },
  { id: 'M2', label: 'Publicación comprobada del piloto' },
  { id: 'M3', label: 'Resultado e informe para invitado' },
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

function findChildIssues(issues: GitHubRoadmapIssue[], metaId: string) {
  const prefix = new RegExp('^' + escapeRegExp(metaId) + '\\.(\\d+)\\s*:', 'i');
  return issues
    .map((issue) => {
      const match = issue.title.match(prefix);
      return match ? { issue, order: Number(match[1]) } : null;
    })
    .filter((entry): entry is { issue: GitHubRoadmapIssue; order: number } => entry !== null)
    .sort((a, b) => a.order - b.order || a.issue.number - b.issue.number)
    .map((entry) => entry.issue);
}

function normalizeMarkdownLabel(value: string) {
  return value
    .replace(/[*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.。]\s*$/, '')
    .trim();
}

function parseChildIdentity(value: string, metaId: string): { id: string; label?: string } | null {
  const normalized = normalizeMarkdownLabel(value);
  const pattern = new RegExp(
    '^(' + escapeRegExp(metaId) + '\\.(\\d+))\\s*(?:(?:·|:|—|-)\\s*)?(.*)$',
    'i',
  );
  const match = normalized.match(pattern);
  if (!match?.[1]) return null;

  const label = match[3]?.trim();
  return {
    id: match[1].toUpperCase(),
    ...(label ? { label } : {}),
  };
}

function checklistChildren(body: string | null, metaId: string): PlannedChild[] {
  if (!body) return [];

  const children: PlannedChild[] = [];
  const seen = new Set<string>();

  for (const line of body.split('\n')) {
    const match = line.match(/^\s*-\s*\[([ xX])\]\s*(.+)$/);
    if (!match?.[2]) continue;

    const identity = parseChildIdentity(match[2], metaId);
    if (!identity || seen.has(identity.id)) continue;

    seen.add(identity.id);
    children.push({
      ...identity,
      checked: match[1]?.toLowerCase() === 'x',
    });
  }

  return children.sort((a, b) => {
    const aNumber = Number(a.id.split('.')[1]);
    const bNumber = Number(b.id.split('.')[1]);
    return aNumber - bNumber;
  });
}

function titleChild(issue: GitHubRoadmapIssue, metaId: string): PlannedChild | null {
  const colon = issue.title.indexOf(':');
  if (colon < 0) return null;
  return parseChildIdentity(
    issue.title.slice(0, colon) + ' · ' + issue.title.slice(colon + 1),
    metaId,
  );
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

function resolveChildren(
  issues: GitHubRoadmapIssue[],
  parentIssue: GitHubRoadmapIssue | undefined,
  metaId: string,
): RoadmapChildSnapshot[] {
  const dedicatedIssues = findChildIssues(issues, metaId);
  const dedicatedById = new Map<string, GitHubRoadmapIssue>();
  for (const issue of dedicatedIssues) {
    const identity = titleChild(issue, metaId);
    if (identity) dedicatedById.set(identity.id, issue);
  }

  const checklistPlan = checklistChildren(parentIssue?.body ?? null, metaId);
  const plannedChildren = checklistPlan.length > 0
    ? checklistPlan
    : dedicatedIssues.flatMap((issue) => {
        const identity = titleChild(issue, metaId);
        return identity ? [identity] : [];
      });

  return plannedChildren.map((planned) => {
    const dedicatedIssue = dedicatedById.get(planned.id);

    if (dedicatedIssue) {
      const issueIdentity = titleChild(dedicatedIssue, metaId);
      return {
        id: planned.id,
        label: planned.label ?? issueIdentity?.label,
        status: statusFromIssue(dedicatedIssue),
        source: sourceForIssue(dedicatedIssue),
      };
    }

    return {
      id: planned.id,
      label: planned.label,
      status: planned.checked ? 'OK' : 'PENDIENTE',
      ...(parentIssue ? { source: sourceForIssue(parentIssue, 'checklist') } : {}),
    };
  });
}

function resolveMeta(
  issues: GitHubRoadmapIssue[],
  definition: MetaDefinition,
): RoadmapMetaSnapshot {
  const metaIssue = definition.legacyIssueNumber
    ? issues.find((issue) => issue.number === definition.legacyIssueNumber)
    : findIssueByPrefix(issues, definition.id);
  const children = resolveChildren(issues, metaIssue, definition.id);

  if (children.length === 0) {
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
    ...(metaIssue
      ? { source: sourceForIssue(metaIssue, definition.legacyIssueNumber ? 'legacy' : 'issue') }
      : {}),
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
