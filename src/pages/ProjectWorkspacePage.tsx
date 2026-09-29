import * as React from 'react';
import type { ProjectDocumentMetadata } from '../services/firestore/document-types.js';
import type { ProjectMetadata } from '../services/firestore/types.js';
import { useAuthSession } from '../services/auth/context.js';
import { useProductRuntime } from '../services/application/product-runtime.js';

type WorkspaceTab = 'resumen' | 'documentos';

type DocumentReferenceState =
  | 'unchecked'
  | 'checking'
  | 'available'
  | 'authorization-required'
  | 'unavailable'
  | 'stale'
  | 'error';

type OperationState =
  | { status: 'idle' }
  | { status: 'pending'; label: string }
  | { status: 'cancelled'; message: string }
  | { status: 'error'; message: string }
  | { status: 'success'; message: string };

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

export function driveReferenceStateLabel(
  state: DocumentReferenceState,
): string {
  switch (state) {
    case 'unchecked':
      return 'No verificada';
    case 'checking':
      return 'Verificando…';
    case 'available':
      return 'Disponible';
    case 'authorization-required':
      return 'Requiere autorización';
    case 'unavailable':
      return 'No disponible';
    case 'stale':
      return 'Referencia obsoleta';
    case 'error':
      return 'Error de verificación';
  }
}

export function ProjectWorkspacePage({
  initialProject,
  onBack,
}: {
  initialProject: ProjectMetadata;
  onBack(): void;
}) {
  const { session } = useAuthSession();
  const runtime = useProductRuntime();
  const [project, setProject] = React.useState(initialProject);
  const [activeTab, setActiveTab] = React.useState<WorkspaceTab>('resumen');
  const [documents, setDocuments] = React.useState<ProjectDocumentMetadata[]>([]);
  const [listState, setListState] = React.useState<'idle' | 'loading' | 'empty' | 'loaded' | 'error'>('idle');
  const [operation, setOperation] = React.useState<OperationState>({ status: 'idle' });
  const [referenceStates, setReferenceStates] = React.useState<Record<string, DocumentReferenceState>>({});
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const pendingRef = React.useRef(false);

  React.useEffect(() => {
    setProject(initialProject);
  }, [initialProject]);

  const refreshDocuments = React.useCallback(async () => {
    if (runtime.status !== 'available' || session.status !== 'authenticated') {
      setDocuments([]);
      setListState('idle');
      return;
    }

    setListState('loading');
    try {
      const items = await runtime.services.documents.list(session, project.id);
      setDocuments(items);
      setListState(items.length === 0 ? 'empty' : 'loaded');
      setReferenceStates((current) => Object.fromEntries(
        items.map((item) => [item.id, current[item.id] ?? 'unchecked']),
      ));
    } catch {
      setListState('error');
    }
  }, [project.id, runtime, session]);

  React.useEffect(() => {
    if (activeTab === 'documentos') void refreshDocuments();
  }, [activeTab, refreshDocuments]);

  if (session.status !== 'authenticated') {
    return (
      <div className="project-state-card">
        Inicia sesión con Google para abrir el workspace del proyecto.
      </div>
    );
  }
  if (runtime.status === 'checking') {
    return <div className="project-state-card">Preparando integración autenticada…</div>;
  }
  if (runtime.status === 'unavailable') {
    return (
      <div className="project-state-card">
        <strong>Integración autenticada no disponible.</strong>
        <span>{runtime.reason}</span>
      </div>
    );
  }

  const services = runtime.services;
  const driveState = services.driveAuthorization.getState().status;

  const authorizeDrive = async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setOperation({ status: 'pending', label: 'Autorizando Google Drive…' });
    try {
      await services.driveAuthorization.authorize();
      setOperation({ status: 'success', message: 'Google Drive autorizado para esta sesión.' });
    } catch (error) {
      setOperation({
        status: 'error',
        message: errorMessage(error, 'No fue posible autorizar Google Drive.'),
      });
    } finally {
      pendingRef.current = false;
    }
  };

  const prepareDriveFolders = async () => {
    if (pendingRef.current || project.driveFolders) return;
    pendingRef.current = true;
    setOperation({ status: 'pending', label: 'Preparando carpetas del proyecto…' });
    try {
      if (!services.driveAuthorization.getAccessToken()) {
        await services.driveAuthorization.authorize();
      }
      const folders = await services.driveFolders.provision({
        applicationRootName: 'Analisis Documental',
        projectId: project.id,
        projectName: project.name,
      });
      const updated = await services.projects.updateDriveFolders(
        session,
        project.id,
        folders,
      );
      if (!updated) {
        throw new Error(
          'Drive confirmó las carpetas, pero Firestore no confirmó la metadata del proyecto.',
        );
      }
      setProject(updated);
      setOperation({
        status: 'success',
        message: 'Carpetas Drive confirmadas y vinculadas al proyecto.',
      });
    } catch (error) {
      setOperation({
        status: 'error',
        message: errorMessage(error, 'No fue posible preparar las carpetas Drive.'),
      });
    } finally {
      pendingRef.current = false;
    }
  };

  const uploadLocalFile = async (file: File) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setOperation({ status: 'pending', label: `Cargando ${file.name}…` });
    try {
      await services.incorporation.uploadLocal(session, project.id, {
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        byteLength: file.size,
        body: file,
      });
      setOperation({
        status: 'success',
        message: 'Drive y metadata confirmaron el documento.',
      });
      await refreshDocuments();
    } catch (error) {
      setOperation({
        status: 'error',
        message: errorMessage(
          error,
          'La carga no fue confirmada; no se informará como exitosa.',
        ),
      });
    } finally {
      pendingRef.current = false;
    }
  };

  const openPicker = async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setOperation({ status: 'pending', label: 'Abriendo Google Picker…' });
    try {
      const outcome = await services.incorporation.pick(session, project.id);
      if (outcome.status === 'cancelled') {
        setOperation({
          status: 'cancelled',
          message: 'Selección cancelada; no se persistió metadata.',
        });
      } else {
        setOperation({
          status: 'success',
          message: `${outcome.metadataIds.length} documento(s) confirmado(s) y persistido(s).`,
        });
        await refreshDocuments();
      }
    } catch (error) {
      const message = errorMessage(error, 'Google Picker no confirmó la selección.');
      setOperation({
        status: message.toLowerCase().includes('authorization')
          ? 'error'
          : 'error',
        message,
      });
    } finally {
      pendingRef.current = false;
    }
  };

  const verifyReference = async (document: ProjectDocumentMetadata) => {
    setReferenceStates((current) => ({ ...current, [document.id]: 'checking' }));
    try {
      const result = await services.driveReader.read(document.driveFileId);
      const next: DocumentReferenceState =
        result.status === 'available'
          ? 'available'
          : result.status === 'authorization-required'
            ? 'authorization-required'
            : result.status === 'unavailable'
              ? 'unavailable'
              : 'stale';
      setReferenceStates((current) => ({ ...current, [document.id]: next }));
    } catch {
      setReferenceStates((current) => ({ ...current, [document.id]: 'error' }));
    }
  };

  const pending = operation.status === 'pending';

  return (
    <section className="project-workspace" aria-labelledby="workspace-title">
      <header className="project-page-heading">
        <div className="workspace-heading-row">
          <div>
            <span className="hero-tag">Workspace autenticado</span>
            <h2 id="workspace-title">{project.name}</h2>
            <p>Proyecto persistente · {project.id}</p>
          </div>
          <button type="button" className="btn-secondary" onClick={onBack}>
            Volver a Mis proyectos
          </button>
        </div>
      </header>

      <nav className="workspace-tabs" aria-label="Áreas del proyecto">
        {([
          ['resumen', 'Resumen'],
          ['documentos', 'Documentos'],
        ] as const).map(([id, label]) => (
          <button
            type="button"
            className={activeTab === id ? 'workspace-tab active' : 'workspace-tab'}
            key={id}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {operation.status !== 'idle' && (
        <div
          className={operation.status === 'error' ? 'project-error' : 'project-state-card'}
          role={operation.status === 'error' ? 'alert' : 'status'}
        >
          {operation.status === 'pending' ? operation.label : operation.message}
        </div>
      )}

      {activeTab === 'resumen' && (
        <section className="workspace-panel">
          <h3>Resumen</h3>
          <p>
            Drive: <strong>{driveState}</strong> · Carpetas del proyecto:{' '}
            <strong>{project.driveFolders ? 'confirmadas' : 'pendientes'}</strong>
          </p>
          <div className="workspace-actions">
            {!services.driveAuthorization.getAccessToken() && (
              <button
                type="button"
                className="btn-primary"
                disabled={pending}
                onClick={() => void authorizeDrive()}
              >
                Autorizar Google Drive
              </button>
            )}
            {!project.driveFolders && (
              <button
                type="button"
                className="btn-secondary"
                disabled={pending}
                onClick={() => void prepareDriveFolders()}
              >
                Preparar carpetas Drive
              </button>
            )}
          </div>
        </section>
      )}

      {activeTab === 'documentos' && (
        <section className="workspace-panel" aria-labelledby="workspace-documents-title">
          <h3 id="workspace-documents-title">Documentos</h3>
          <p>
            Los documentos locales se persisten en Drive antes de crear metadata.
            Picker cancelado no crea registros.
          </p>

          <div className="workspace-actions">
            <input
              ref={fileInputRef}
              className="visually-hidden-file-input"
              type="file"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                if (file) void uploadLocalFile(file);
              }}
            />
            <button
              type="button"
              className="btn-primary"
              disabled={pending || !project.driveFolders}
              onClick={() => fileInputRef.current?.click()}
            >
              Cargar archivo local
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={pending || !project.driveFolders}
              onClick={() => void openPicker()}
            >
              Seleccionar desde Google Drive
            </button>
            {!services.driveAuthorization.getAccessToken() && (
              <button
                type="button"
                className="btn-secondary"
                disabled={pending}
                onClick={() => void authorizeDrive()}
              >
                Autorizar Drive
              </button>
            )}
          </div>

          {!project.driveFolders && (
            <div className="project-state-card">
              Prepara primero las carpetas Drive del proyecto.
            </div>
          )}

          {listState === 'loading' && (
            <div className="project-state-card">Cargando documentos persistidos…</div>
          )}
          {listState === 'empty' && (
            <div className="project-state-card">No hay documentos persistidos.</div>
          )}
          {listState === 'error' && (
            <div className="project-error" role="alert">
              No fue posible listar los documentos persistidos.
            </div>
          )}
          {listState === 'loaded' && (
            <ul className="workspace-list">
              {documents.map((document) => {
                const state = referenceStates[document.id] ?? 'unchecked';
                return (
                  <li key={document.id}>
                    <div>
                      <strong>{document.name ?? document.id}</strong>
                      <span>
                        {document.source} · {document.mimeType ?? 'tipo no informado'}
                      </span>
                      <span>Drive: {driveReferenceStateLabel(state)}</span>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={state === 'checking'}
                      onClick={() => void verifyReference(document)}
                    >
                      Verificar referencia
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </section>
  );
}
