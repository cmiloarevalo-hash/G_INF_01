import { useRef, useState } from 'react';
import type { ChangeEvent, FC } from 'react';

const PDF_HEADER_BYTES = 1024;

export async function isPdfFile(file: File): Promise<boolean> {
  if (!file.name.toLowerCase().endsWith('.pdf')) return false;

  // Inspect only the small header area; the document is not uploaded or parsed.
  const prefix = new Uint8Array(await file.slice(0, PDF_HEADER_BYTES).arrayBuffer());
  const header = new TextDecoder().decode(prefix);
  return header.includes('%PDF-');
}

export function fileIdentity(file: File): string {
  return [file.name, file.size, file.lastModified, file.type].join('\u0000');
}

export function removeSelectedFile(files: File[], identity: string): File[] {
  return files.filter((file) => fileIdentity(file) !== identity);
}

export function serializeSelectionUpdate(
  pending: Promise<void>,
  update: () => Promise<void>,
  onError: (error: unknown) => void,
): Promise<void> {
  return pending.then(update).catch(onError);
}

export async function validateAndMergeFiles(
  current: File[],
  incoming: File[],
): Promise<{ files: File[]; rejected: string[]; duplicates: string[] }> {
  const files = [...current];
  const identities = new Set(current.map(fileIdentity));
  const rejected: string[] = [];
  const duplicates: string[] = [];

  for (const file of incoming) {
    if (!(await isPdfFile(file))) {
      rejected.push(file.name);
      continue;
    }

    const identity = fileIdentity(file);
    if (identities.has(identity)) {
      duplicates.push(file.name);
      continue;
    }

    identities.add(identity);
    files.push(file);
  }

  return { files, rejected, duplicates };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(size)} ${units[unit]}`;
}

export const GuestDocumentsPage: FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<File[]>([]);
  const pendingUpdateRef = useRef<Promise<void>>(Promise.resolve());
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState('');

  const enqueueUpdate = (update: () => Promise<void>) => {
    pendingUpdateRef.current = serializeSelectionUpdate(
      pendingUpdateRef.current,
      update,
      () => setMessage('No se pudo actualizar la selección local. Intenta de nuevo.'),
    );
  };

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const incoming = Array.from(input.files ?? []);
    input.value = '';
    if (incoming.length === 0) return;

    enqueueUpdate(async () => {
      const current = filesRef.current;
      const result = await validateAndMergeFiles(current, incoming);
      filesRef.current = result.files;
      setFiles(result.files);
      const notices = [
        ...(result.rejected.length > 0
          ? [`No se reconocieron como PDF (revisa su extensión y firma): ${result.rejected.join(', ')}.`]
          : []),
        ...(result.duplicates.length > 0
          ? [`Ya estaban seleccionados y no se duplicaron: ${result.duplicates.join(', ')}.`]
          : []),
        ...(result.files.length > current.length
          ? [`Se agregaron ${result.files.length - current.length} archivo(s) PDF.`]
          : []),
      ];
      setMessage(notices.join(' '));
    });
  };

  const removeFile = (identity: string) => {
    enqueueUpdate(async () => {
      const next = removeSelectedFile(filesRef.current, identity);
      filesRef.current = next;
      setFiles(next);
      setMessage('Se quitó el documento de la selección local.');
    });
  };

  const clearFiles = () => {
    enqueueUpdate(async () => {
      filesRef.current = [];
      setFiles([]);
      setMessage('Se quitaron todos los documentos de la selección local.');
    });
  };

  return (
    <div className="guest-documents-page">
      <section className="guest-documents-intro">
        <span className="hero-tag">Espacio temporal de invitado</span>
        <h2>Documentos PDF locales</h2>
        <p>Selecciona uno o más archivos PDF de tu dispositivo. Puedes quitar archivos individualmente o vaciar la selección.</p>
      </section>

      <section className="guest-file-panel" aria-labelledby="selected-files-title">
        <div className="guest-file-actions">
          <input
            ref={inputRef}
            className="visually-hidden-file-input"
            type="file"
            accept="application/pdf,.pdf"
            multiple
            aria-label="Seleccionar archivos PDF locales"
            onChange={handleFileSelection}
          />
          <button type="button" className="btn-primary" onClick={() => inputRef.current?.click()}>
            Seleccionar archivos PDF
          </button>
          {files.length > 0 && (
            <button type="button" className="btn-secondary" onClick={clearFiles}>
              Quitar todos
            </button>
          )}
        </div>

        {message && <p className="guest-selection-message" role="status">{message}</p>}
        <h3 id="selected-files-title">Seleccionados ({files.length})</h3>
        {files.length === 0 ? (
          <p className="guest-empty-state">Todavía no has seleccionado documentos.</p>
        ) : (
          <ul className="guest-file-list">
            {files.map((file) => (
              <li className="guest-file-row" key={fileIdentity(file)}>
                <div className="guest-file-details">
                  <span className="guest-file-name">{file.name}</span>
                  <span className="guest-file-size">{formatFileSize(file.size)}</span>
                </div>
                <button
                  type="button"
                  className="btn-secondary guest-remove-button"
                  onClick={() => removeFile(fileIdentity(file))}
                  aria-label={`Quitar ${file.name}`}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="guest-limit-notice" aria-label="Límites de la selección local">
        <strong>Alcance de esta etapa</strong>
        <p>Los archivos permanecen como referencias locales mientras esta página esté abierta. No se cargan al servidor ni se guardan en Drive o en un proyecto persistente.</p>
        <p>El procesamiento del contenido, el análisis con IA y la generación de informes todavía no están integrados.</p>
      </aside>
    </div>
  );
};
