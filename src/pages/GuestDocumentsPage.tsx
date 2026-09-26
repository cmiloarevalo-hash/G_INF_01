import { useRef, useState } from 'react';
import type { ChangeEvent, FC } from 'react';
import { selectionLimitError, MAX_GUEST_FILES, MAX_GUEST_TOTAL_BYTES } from '../shared/guest-limits.js';

export type GuestFileStatus = 'Pendiente' | 'Analizado' | 'No analizado';
export interface GuestFileEntry { file: File; status: GuestFileStatus; reason?: string }

export function fileIdentity(file: File): string {
  return [file.name, file.size, file.lastModified, file.type].join('\u0000');
}

export function removeSelectedFile(files: File[], identity: string): File[] {
  return files.filter((file) => fileIdentity(file) !== identity);
}

export function mergeSelectedFiles(current: File[], incoming: File[]): { files: File[]; duplicates: string[] } {
  const files = [...current];
  const identities = new Set(current.map(fileIdentity));
  const duplicates: string[] = [];
  for (const file of incoming) {
    const identity = fileIdentity(file);
    if (identities.has(identity)) duplicates.push(file.name);
    else { identities.add(identity); files.push(file); }
  }
  return { files, duplicates };
}

export function serializeSelectionUpdate(
  pending: Promise<void>,
  update: () => Promise<void>,
  onError: (error: unknown) => void,
): Promise<void> {
  return pending.then(update).catch(onError);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit += 1; }
  return `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(size)} ${units[unit]}`;
}

async function fileAsBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(body.error || `Error HTTP ${response.status}`);
  return body;
}

export const GuestDocumentsPage: FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<File[]>([]);
  const pendingUpdateRef = useRef<Promise<void>>(Promise.resolve());
  const [files, setFiles] = useState<File[]>([]);
  const [statuses, setStatuses] = useState<Record<string, GuestFileEntry>>({});
  const [message, setMessage] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [keySource, setKeySource] = useState<'temporary' | 'alias'>('temporary');
  const [accessToken, setAccessToken] = useState('');
  const [aliases, setAliases] = useState<{ id: string; label: string }[]>([]);
  const [selectedAlias, setSelectedAlias] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<unknown>(null);
  const [partial, setPartial] = useState(false);

  const enqueueUpdate = (update: () => Promise<void>) => {
    pendingUpdateRef.current = serializeSelectionUpdate(pendingUpdateRef.current, update,
      () => setMessage('No se pudo actualizar la selección local. Intenta de nuevo.'));
  };

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const incoming = Array.from(input.files ?? []);
    input.value = '';
    if (incoming.length === 0) return;
    enqueueUpdate(async () => {
      const current = filesRef.current;
      const result = mergeSelectedFiles(current, incoming);
      filesRef.current = result.files;
      setFiles(result.files);
      setStatuses((previous) => {
        const next = { ...previous };
        const existingIds = new Set(current.map(fileIdentity));
        for (const file of incoming) if (!existingIds.has(fileIdentity(file))) next[fileIdentity(file)] = { file, status: 'Pendiente' };
        return next;
      });
      setReport(null);
      setMessage(result.duplicates.length ? `Se conservaron todos los archivos seleccionables. Duplicados omitidos: ${result.duplicates.join(', ')}.` : `Se agregaron ${incoming.length} archivo(s).`);
    });
  };

  const removeFile = (file: File) => enqueueUpdate(async () => {
    const next = removeSelectedFile(filesRef.current, fileIdentity(file));
    filesRef.current = next;
    setFiles(next);
    setStatuses((previous) => { const updated = { ...previous }; delete updated[fileIdentity(file)]; return updated; });
    setReport(null);
    setMessage('Se quitó el documento de la selección local.');
  });

  const clearFiles = () => enqueueUpdate(async () => {
    filesRef.current = [];
    setFiles([]);
    setStatuses({});
    setReport(null);
    setMessage('Se quitaron todos los documentos de la selección local.');
  });

  const analyze = async () => {
    const limit = selectionLimitError(files);
    if (limit) { setReport(null); setMessage(limit); setStatuses(Object.fromEntries(files.map((file) => [fileIdentity(file), { file, status: 'No analizado' as const, reason: limit }]))); return; }
    if (keySource === 'temporary' && !apiKey.trim()) { setMessage('Ingresa tu clave de Gemini para esta sesión.'); return; }
    if (keySource === 'alias' && (!accessToken || !selectedAlias)) { setMessage('Autoriza el acceso y selecciona una clave de prueba.'); return; }
    if (files.length === 0) { setMessage('Selecciona al menos un archivo.'); return; }
    setIsAnalyzing(true);
    setReport(null);
    setStatuses(Object.fromEntries(files.map((file) => [fileIdentity(file), { file, status: 'Pendiente' as const }])));
    setMessage('Preparando los archivos legibles para una sola solicitud a Gemini…');
    const credentialHeaders: Record<string, string> = keySource === 'temporary'
      ? { 'x-gemini-api-key': apiKey }
      : { 'x-gemini-key-alias': selectedAlias, 'x-gemini-alias-access-token': accessToken };
    try {
      const payload = [];
      for (const [index, file] of files.entries()) {
        payload.push({ id: `doc-${index + 1}`, name: file.name, mimeType: file.type, size: file.size,
          data: /\.(pdf|png|jpe?g|txt|md|markdown)$/i.test(file.name) ? await fileAsBase64(file) : '' });
      }
      const response = await fetch('/api/guest/analyze', {
        method: 'POST', headers: { 'content-type': 'application/json', ...credentialHeaders },
        body: JSON.stringify({ files: payload }),
      });
      const outcome = await response.json().catch(() => ({ error: `Error HTTP ${response.status}; no se confirmó el análisis.` })) as { report?: unknown; partial?: boolean; error?: string; statuses?: Array<{ id: string; status: GuestFileStatus; reason?: string }> };
      if (outcome.statuses) setStatuses(Object.fromEntries(outcome.statuses.map((entry, index) => {
        const file = files[index]!;
        return [fileIdentity(file), { file, status: entry.status, ...(entry.reason ? { reason: entry.reason } : {}) }];
      })));
      if (!response.ok || !outcome.report) {
        if (!outcome.statuses) setStatuses(Object.fromEntries(files.map((file) => [fileIdentity(file), { file, status: 'No analizado' as const, reason: 'No se confirmó un resultado validado.' }])));
        setMessage(outcome.error ?? `Error HTTP ${response.status}`); return;
      }
      setReport(outcome.report);
      setPartial(Boolean(outcome.partial));
      setMessage(outcome.partial ? 'Resultado preliminar parcial: algunos archivos no se analizaron; revisa su causa antes de interpretar el JSON.' : 'Resultado preliminar validado por el contrato TITLE_STUDY. Requiere revisión humana.');
    } catch (error) {
      setStatuses(Object.fromEntries(files.map((file) => [fileIdentity(file), { file, status: 'No analizado' as const, reason: 'No se confirmó el envío o resultado; revisa el error de conexión.' }])));
      setMessage(error instanceof Error ? error.message : 'No fue posible completar el análisis.');
    } finally { setIsAnalyzing(false); }
  };

  return (
    <div className="guest-documents-page">
      <section className="guest-documents-intro">
        <span className="hero-tag">Espacio temporal de invitado</span>
        <h2>Análisis preliminar de documentos</h2>
        <p>Selecciona documentos inmobiliarios. Se conserva cada archivo y su estado; el piloto analiza PDF, PNG/JPEG y TXT/Markdown legibles.</p>
      </section>

      <section className="guest-file-panel" aria-labelledby="selected-files-title">
        <div className="guest-file-actions">
          <input ref={inputRef} className="visually-hidden-file-input" type="file" multiple aria-label="Seleccionar documentos locales" onChange={handleFileSelection} />
          <button type="button" className="btn-primary" disabled={isAnalyzing} onClick={() => inputRef.current?.click()}>Seleccionar archivos</button>
          {files.length > 0 && <button type="button" className="btn-secondary" disabled={isAnalyzing} onClick={clearFiles}>Quitar todos</button>}
        </div>
        {message && <p className="guest-selection-message" role="status">{message}</p>}
        <h3 id="selected-files-title">Seleccionados ({files.length})</h3>
        {files.length === 0 ? <p className="guest-empty-state">Todavía no has seleccionado documentos.</p> : (
          <ul className="guest-file-list">
            {files.map((file) => {
              const entry = statuses[fileIdentity(file)];
              return <li className="guest-file-row" key={fileIdentity(file)}>
                <div className="guest-file-details"><span className="guest-file-name">{file.name}</span><span className="guest-file-size">{formatFileSize(file.size)} · {entry?.status ?? 'Pendiente'}{entry?.reason ? ` — ${entry.reason}` : ''}</span></div>
                <button type="button" className="btn-secondary guest-remove-button" disabled={isAnalyzing} onClick={() => removeFile(file)} aria-label={`Quitar ${file.name}`}>Quitar</button>
              </li>;
            })}
          </ul>
        )}
        <fieldset disabled={isAnalyzing}>
          <legend>Clave para el análisis</legend>
          <label><input type="radio" name="guest-key-source" checked={keySource === 'temporary'} onChange={() => setKeySource('temporary')} /> Mi clave temporal</label>
          <label><input type="radio" name="guest-key-source" checked={keySource === 'alias'} onChange={() => setKeySource('alias')} /> Clave de prueba del propietario</label>
        </fieldset>
        {keySource === 'temporary' ? <>
          <label className="guest-api-key-label" htmlFor="guest-gemini-key">Clave Gemini para esta sesión</label>
          <input id="guest-gemini-key" className="guest-api-key" type="password" autoComplete="off" disabled={isAnalyzing} value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Pega tu clave de API" />
        </> : <>
          <label className="guest-api-key-label" htmlFor="guest-alias-access">Código de acceso del propietario</label>
          <input id="guest-alias-access" className="guest-api-key" type="password" autoComplete="off" disabled={isAnalyzing} value={accessToken} onChange={(event) => { setAccessToken(event.target.value); setAliases([]); setSelectedAlias(''); }} />
          <button type="button" className="btn-secondary" disabled={isAnalyzing || !accessToken} onClick={async () => {
            try {
              const response = await fetch('/api/guest/key-aliases', { headers: { 'x-gemini-alias-access-token': accessToken }, cache: 'no-store' });
              const data = await readJsonResponse<{ aliases: { id: string; label: string }[] }>(response);
              setAliases(data.aliases); setSelectedAlias('');
              setMessage(data.aliases.length ? 'Selecciona una clave de prueba.' : 'No hay claves de prueba configuradas.');
            } catch (error) { setAliases([]); setSelectedAlias(''); setMessage(error instanceof Error ? error.message : 'No se pudieron cargar los alias.'); }
          }}>Consultar claves de prueba</button>
          {aliases.length > 0 && <><label className="guest-api-key-label" htmlFor="guest-key-alias">Clave de prueba</label>
            <select id="guest-key-alias" className="guest-api-key" value={selectedAlias} disabled={isAnalyzing} onChange={(event) => setSelectedAlias(event.target.value)}>
              <option value="">Seleccionar alias</option>{aliases.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
            </select></>}
        </>}
        <button type="button" className="btn-primary guest-analyze-button" disabled={isAnalyzing || files.length === 0 || (keySource === 'temporary' ? !apiKey.trim() : !accessToken || !selectedAlias)} onClick={analyze}>{isAnalyzing ? 'Analizando…' : 'Analizar con Gemini'}</button>
      </section>

      <aside className="guest-limit-notice" aria-label="Procesamiento de documentos">
        <strong>Envío temporal a Gemini</strong>
        <p>Al analizar, los archivos legibles se envían a Google Gemini con el modelo gemini-3.6-flash usando tu clave temporal o un alias autorizado del propietario. El servidor no guarda la clave temporal ni persiste archivos o resultados; Gemini procesa el contenido según sus condiciones del servicio.</p>
        <p>Máximo {MAX_GUEST_FILES} archivos y {MAX_GUEST_TOTAL_BYTES.toLocaleString('es-CL')} bytes originales (50 MB) por selección. Superar un límite bloquea el envío. Los archivos legibles se envían juntos en una solicitud; los incompatibles, como CSV y XLS/XLSX, quedan seleccionados pero no analizados. El proveedor puede aplicar límites técnicos adicionales.</p>
      </aside>
      {report !== null && <section className="guest-report-panel" aria-labelledby="guest-report-title">
        <h3 id="guest-report-title">Resultado preliminar {partial ? '(parcial)' : ''} · requiere revisión humana</h3>
        <pre>{JSON.stringify(report, null, 2)}</pre>
      </section>}
    </div>
  );
};
