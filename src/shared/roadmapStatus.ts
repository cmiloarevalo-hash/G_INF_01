export type RoadmapStatus = 'OK' | 'EN PROCESO' | 'PENDIENTE';

export interface RoadmapSourceReference {
  issueNumber: number;
  url: string;
  kind: 'issue' | 'checklist' | 'legacy';
}

export interface RoadmapChildSnapshot {
  id: string;
  label?: string;
  status: RoadmapStatus;
  source?: RoadmapSourceReference;
}

export interface RoadmapMetaSnapshot {
  id: string;
  label: string;
  status: RoadmapStatus;
  pointsEarned: number;
  pointsMax: number;
  children?: RoadmapChildSnapshot[];
  source?: RoadmapSourceReference;
}

export interface RoadmapSnapshot {
  schemaVersion: 1;
  generatedAt: string | null;
  sourceSha: string;
  overallPercent: number;
  summary: string;
  metas: RoadmapMetaSnapshot[];
}

export interface RoadmapLoadResult {
  snapshot: RoadmapSnapshot;
  live: boolean;
  error?: string;
}

export const ROADMAP_MACHINE_ISSUE_URL =
  'https://api.github.com/repos/cmiloarevalo-hash/G_INF_01/issues/43';

export const ROADMAP_STATUS_START = '<!-- ROADMAP_STATUS_JSON_START -->';
export const ROADMAP_STATUS_END = '<!-- ROADMAP_STATUS_JSON_END -->';

export const FALLBACK_ROADMAP_SNAPSHOT: RoadmapSnapshot = {
  schemaVersion: 1,
  generatedAt: null,
  sourceSha: '1a4167c1e29b46efaf09662b8fb11919bfac44cf',
  overallPercent: 50,
  summary: '50% ponderado: M1 20 + M2 10 + M3 20',
  metas: [
    { id: 'M1', label: 'Análisis invitado de una llamada', status: 'OK', pointsEarned: 20, pointsMax: 20 },
    {
      id: 'M2', label: 'Publicación comprobada del piloto', status: 'EN PROCESO', pointsEarned: 10, pointsMax: 20,
      children: [
        { id: 'M2.1', label: 'Preparar la versión', status: 'OK' },
        { id: 'M2.2', label: 'Configurar acceso seguro', status: 'OK' },
        { id: 'M2.3', label: 'Publicar y probar', status: 'EN PROCESO' },
        { id: 'M2.4', label: 'Registrar y decidir', status: 'PENDIENTE' },
      ],
    },
    {
      id: 'M3', label: 'Resultado e informe para invitado', status: 'OK', pointsEarned: 20, pointsMax: 20,
      children: [
        { id: 'M3.1', label: 'Contrato de presentación', status: 'OK' },
        { id: 'M3.2', label: 'Vista web enriquecida TITLE_STUDY', status: 'OK' },
        { id: 'M3.3', label: 'Renderer y descarga DOCX', status: 'OK' },
        { id: 'M3.4', label: 'Verificación integrada y revisión humana', status: 'OK' },
      ],
    },
    { id: 'M4', label: 'Trabajo persistente y capacidades completas', status: 'PENDIENTE', pointsEarned: 0, pointsMax: 20 },
    { id: 'M5', label: 'Integración del producto completo', status: 'PENDIENTE', pointsEarned: 0, pointsMax: 20 },
  ],
};

function isRoadmapStatus(value: unknown): value is RoadmapStatus {
  return value === 'OK' || value === 'EN PROCESO' || value === 'PENDIENTE';
}

function isSnapshot(value: unknown): value is RoadmapSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<RoadmapSnapshot>;
  if (candidate.schemaVersion !== 1 || typeof candidate.sourceSha !== 'string' || typeof candidate.overallPercent !== 'number' || typeof candidate.summary !== 'string' || !Array.isArray(candidate.metas)) return false;
  return candidate.metas.length === 5 && candidate.metas.every((meta) => meta && typeof meta.id === 'string' && typeof meta.label === 'string' && isRoadmapStatus(meta.status) && typeof meta.pointsEarned === 'number' && typeof meta.pointsMax === 'number' && (meta.children === undefined || (Array.isArray(meta.children) && meta.children.every((child) => child && typeof child.id === 'string' && isRoadmapStatus(child.status)))));
}

export function parseRoadmapSnapshotIssueBody(body: string): RoadmapSnapshot {
  const start = body.indexOf(ROADMAP_STATUS_START);
  const end = body.indexOf(ROADMAP_STATUS_END);
  if (start < 0 || end <= start) throw new Error('El Issue de snapshot no contiene el bloque ROADMAP_STATUS_JSON.');
  const rawBlock = body.slice(start + ROADMAP_STATUS_START.length, end).trim();
  const rawJson = rawBlock.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed: unknown = JSON.parse(rawJson);
  if (!isSnapshot(parsed)) throw new Error('El snapshot de roadmap no cumple el contrato esperado.');
  return parsed;
}

export async function loadRoadmapSnapshot(fetchImpl: typeof fetch = fetch): Promise<RoadmapLoadResult> {
  try {
    const response = await fetchImpl(ROADMAP_MACHINE_ISSUE_URL, { headers: { accept: 'application/vnd.github+json' }, cache: 'no-store' });
    if (!response.ok) throw new Error('GitHub respondió HTTP ' + response.status + '.');
    const payload = await response.json() as { body?: unknown };
    if (typeof payload.body !== 'string') throw new Error('GitHub no devolvió el body del Issue #43.');
    return { snapshot: parseRoadmapSnapshotIssueBody(payload.body), live: true };
  } catch (error) {
    return { snapshot: FALLBACK_ROADMAP_SNAPSHOT, live: false, error: error instanceof Error ? error.message : 'No fue posible leer el snapshot de GitHub.' };
  }
}
