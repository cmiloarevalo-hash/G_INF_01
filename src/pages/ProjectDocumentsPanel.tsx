import * as React from 'react';
import type { AuthSessionState } from '../services/auth/types.js';
import type { ConfirmedDriveFile } from '../services/drive/index.js';
import type { ProjectMetadata } from '../services/firestore/types.js';
import { createSingleFlightGate } from './projectFlow.js';
import {
  UNAVAILABLE_PROJECT_DOCUMENTS_RUNTIME,
  authorizeDriveForUi,
  pickProjectDocumentForUi,
  projectDocumentsAvailability,
  uploadProjectDocumentForUi,
  type ProjectDocumentsRuntime,
} from './documentsFlow.js';

interface ConfirmedDocument {
  id: string;
  name: string;
  mimeType?: string;
}

export interface ProjectDocumentsPanelProps {
  session: AuthSessionState;
  project: ProjectMetadata;
  runtime?: ProjectDocumentsRuntime;
}

export function ProjectDocumentsPanel({
  session,
  project,
  runtime = UNAVAILABLE_PROJECT_DOCUMENTS_RUNTIME,
}: ProjectDocumentsPanelProps) {
  const gate = React.useRef(createSingleFlightGate());
  const [, setRevision] = React.useState(0);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [documents, setDocuments] = React.useState<ConfirmedDocument[]>([]);
  const [operation, setOperation] = React.useState<
    | { status: 'idle' }
    | { status: 'pending' }
    | { status: 'error'; message: string }
  >({ status: 'idle' });

  const availability = projectDocumentsAvailability(session, runtime, project);

  const authorize = async () => {
    setOperation({ status: 'idle' });
    try {
      const pending = authorizeDriveForUi(session, runtime);
      setRevision((value) => value + 1);
      await pending;
      setRevision((value) => value + 1);
    } catch (cause) {
      setRevision((value) => value + 1);
      setOperation({
        status: 'error',
        message: cause instanceof Error ? cause.message : 'No fue posible autorizar Drive.',
      });
    }
  };

  const runConfirmedOperation = async (
    action: () => Promise<ConfirmedDocument | null>,
  ) => {
    if (gate.current.isPending()) return;
    setOperation({ status: 'pending' });
    try {
      const result = await gate.current.run(action);
      if (result.status === 'completed' && result.value) {
        setDocuments((current) => [...current, result.value as ConfirmedDocument]);
      }
      setOperation({ status: 'idle' });
    } catch (cause) {
      setOperation({
        status: 'error',
        message: cause instanceof Error ? cause.message : 'La operación Drive falló.',
      });
    }
  };

  const upload = async () => {
    if (!selectedFile) return;
    await runConfirmedOperation(async () => {
      const confirmed: ConfirmedDriveFile = await uploadProjectDocumentForUi(
        session,
        runtime,
        project,
        {
          name: selectedFile.name,
          mimeType: selectedFile.type || 'application/octet-stream',
          data: selectedFile,
        },
      );
      setSelectedFile(null);
      return confirmed;
    });
  };

  const pick = async () => {
    await runConfirmedOperation(async () => {
      const result = await pickProjectDocumentForUi(session, runtime, project);
      return result.status === 'selected' ? result.file : null;
    });
  };

  if (availability.status === 'checking-session') {
    return <div className="project-state-card">Verificando sesión para documentos…</div>;
  }
  if (availability.status === 'sign-in-required') {
    return <div className="project-state-card">Inicia sesión para usar documentos de proyecto.</div>;
  }
  if (availability.status === 'runtime-unavailable') {
    return (
      <div className="project-state-card">
        <strong>Google Drive no disponible.</strong>
        <span>{availability.reason}</span>
      </div>
    );
  }
  if (availability.status === 'folders-unavailable') {
    return (
      <div className="project-state-card">
        Las carpetas Drive del proyecto todavía no han sido confirmadas.
      </div>
    );
  }

  const authorizationPending = availability.status === 'authorizing';
  const authorized = availability.status === 'authorized';

  return (
    <section className="project-result" aria-label="Documentos del proyecto">
      <h3>Documentos</h3>

      {!authorized && (
        <>
          {availability.status === 'authorization-error' && (
            <div className="project-error" role="alert">{availability.message}</div>
          )}
          <button
            type="button"
            className="btn-primary"
            disabled={authorizationPending}
            onClick={() => void authorize()}
          >
            {authorizationPending ? 'Autorizando Drive…' : 'Autorizar Drive'}
          </button>
        </>
      )}

      {authorized && (
        <>
          <label htmlFor="project-drive-file">Archivo local</label>
          <input
            id="project-drive-file"
            type="file"
            disabled={operation.status === 'pending'}
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="btn-primary"
            disabled={!selectedFile || operation.status === 'pending'}
            onClick={() => void upload()}
          >
            {operation.status === 'pending' ? 'Procesando…' : 'Subir a Documentos'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={operation.status === 'pending'}
            onClick={() => void pick()}
          >
            Seleccionar desde Drive
          </button>
        </>
      )}

      {operation.status === 'error' && (
        <div className="project-error" role="alert">{operation.message}</div>
      )}

      {documents.length === 0 ? (
        <div className="project-state-card">No hay documentos confirmados en esta vista.</div>
      ) : (
        <ul className="project-list">
          {documents.map((document) => (
            <li key={document.id}>
              <strong>{document.name}</strong>
              <span>{document.id}</span>
              {document.mimeType && <span>{document.mimeType}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
