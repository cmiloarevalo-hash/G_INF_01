import * as React from 'react';
import { TitleStudyResult } from '../components/TitleStudyResult.js';
import type { TitleStudy } from '../report-types/title-study/schema.js';
import type { ProjectDocumentMetadata } from '../services/firestore/document-types.js';
import type { ProjectMetadata } from '../services/firestore/types.js';
import type { ProjectAnalysisMetadata, ProjectReportMetadata } from '../services/firestore/artifacts.js';
import { useAuthSession } from '../services/auth/context.js';
import { useProductRuntime } from '../services/application/product-runtime.js';
import { PersistedProjectAnalysisError } from '../services/application/project-analysis.js';
import { AuthenticatedCapabilityError } from '../services/application/authenticated-capabilities.js';

type WorkspaceTab = 'resumen' | 'documentos' | 'resultado' | 'informe' | 'historial';

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
  onOpenApisModels,
  onOpenReports,
}: {
  initialProject: ProjectMetadata;
  onBack(): void;
  onOpenApisModels?(): void;
  onOpenReports?(): void;
}) {
  const { session } = useAuthSession();
  const runtime = useProductRuntime();
  const [project, setProject] = React.useState(initialProject);
  const [activeTab, setActiveTab] = React.useState<WorkspaceTab>('resumen');
  const [documents, setDocuments] = React.useState<ProjectDocumentMetadata[]>([]);
  const [listState, setListState] = React.useState<'idle' | 'loading' | 'empty' | 'loaded' | 'error'>('idle');
  const [operation, setOperation] = React.useState<OperationState>({ status: 'idle' });
  const [analysisReport, setAnalysisReport] = React.useState<TitleStudy | null>(null);
  const [analysisMetadataId, setAnalysisMetadataId] = React.useState<string | null>(null);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);
  const [analysisPending, setAnalysisPending] = React.useState(false);
  const [reportMetadataId, setReportMetadataId] = React.useState<string | null>(null);
  const [reportPending, setReportPending] = React.useState(false);
  const [reportError, setReportError] = React.useState<string | null>(null);
  const [analysisHistory, setAnalysisHistory] = React.useState<ProjectAnalysisMetadata[]>([]);
  const [reportHistory, setReportHistory] = React.useState<ProjectReportMetadata[]>([]);
  const [historyStatus, setHistoryStatus] = React.useState<'idle' | 'loading' | 'loaded' | 'empty' | 'failure'>('idle');
  const [historyMessage, setHistoryMessage] = React.useState<string | null>(null);
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
    if (activeTab === 'documentos' || activeTab === 'resultado') {
      void refreshDocuments();
    }
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
      const updated = await services.driveFolderLinks.prepare(
        session,
        project,
      );
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


  const analyzePersistedDocuments = async () => {
    if (analysisPending || pendingRef.current) return;
    if (!services.aiCredentials.get()) {
      setAnalysisError('Configura una clave Gemini en APIs y modelos antes de analizar.');
      return;
    }

    setAnalysisPending(true);
    setAnalysisError(null);
    setAnalysisMetadataId(null);
    setAnalysisReport(null);
    try {
      const result = await services.projectAnalysis.analyze(
        session,
        project.id,
        services.aiInstruction.get(),
      );
      setAnalysisReport(result.report);
      setAnalysisMetadataId(result.metadata.id);
    } catch (error) {
      if (
        error instanceof PersistedProjectAnalysisError &&
        error.validatedReport
      ) {
        setAnalysisReport(error.validatedReport);
      }
      setAnalysisError(errorMessage(
        error,
        'No se confirmó un resultado analítico.',
      ));
    } finally {
      setAnalysisPending(false);
    }
  };

  const generateAndPersistReport = async () => {
    if (reportPending || !analysisReport || !analysisMetadataId) return;
    setReportPending(true);
    setReportError(null);
    setReportMetadataId(null);
    try {
      const metadata = await services.reportPersistence.persist(
        session,
        project.id,
        analysisReport,
      );
      setReportMetadataId(metadata.id);
    } catch (error) {
      if (
        error instanceof AuthenticatedCapabilityError &&
        error.confirmedDriveFileId
      ) {
        setReportError(
          `${error.message} Drive confirmó ${error.confirmedDriveFileId}, pero el cierre de metadata quedó incompleto.`,
        );
      } else {
        setReportError(errorMessage(
          error,
          'No se confirmó la generación y persistencia del informe.',
        ));
      }
    } finally {
      setReportPending(false);
    }
  };

  const refreshHistory = React.useCallback(async () => {
    setHistoryStatus('loading');
    setHistoryMessage(null);
    const [analysesResult, reportsResult] = await Promise.all([
      services.history.listAnalyses(session, project.id),
      services.history.listReports(session, project.id),
    ]);

    if (
      analysesResult.status === 'failure' ||
      reportsResult.status === 'failure'
    ) {
      setAnalysisHistory(
        analysesResult.status === 'items' ? analysesResult.items : [],
      );
      setReportHistory(
        reportsResult.status === 'items' ? reportsResult.items : [],
      );
      setHistoryStatus('failure');
      setHistoryMessage('No fue posible cargar todo el historial persistido.');
      return;
    }

    const analysesItems =
      analysesResult.status === 'items' ? analysesResult.items : [];
    const reportsItems =
      reportsResult.status === 'items' ? reportsResult.items : [];
    setAnalysisHistory(analysesItems);
    setReportHistory(reportsItems);
    setHistoryStatus(
      analysesItems.length === 0 && reportsItems.length === 0
        ? 'empty'
        : 'loaded',
    );
  }, [project.id, services.history, session]);

  React.useEffect(() => {
    if (activeTab === 'historial') void refreshHistory();
  }, [activeTab, refreshHistory]);

  const reopenAnalysis = async (metadataId: string) => {
    setHistoryMessage('Reabriendo análisis…');
    const result = await services.history.reopenAnalysis(
      session,
      project.id,
      metadataId,
    );
    if (result.status === 'available') {
      setAnalysisReport(result.content);
      setAnalysisMetadataId(result.metadata.id);
      setHistoryMessage(null);
      setActiveTab('resultado');
      return;
    }
    if (result.status === 'not-found') {
      setHistoryMessage('El análisis ya no existe en Firestore.');
      return;
    }
    if (result.status === 'stale') {
      setHistoryMessage(
        result.reason === 'not-found'
          ? 'El análisis conserva metadata, pero su archivo Drive está obsoleto.'
          : 'El análisis conserva metadata, pero su archivo Drive no está disponible.',
      );
      return;
    }
    if (result.status === 'authorization-required') {
      setHistoryMessage('Drive requiere autorización para reabrir el análisis.');
      return;
    }
    setHistoryMessage('No fue posible reabrir el análisis.');
  };

  const reopenReport = async (metadataId: string) => {
    setHistoryMessage('Abriendo informe…');
    const result = await services.history.reopenReport(
      session,
      project.id,
      metadataId,
    );
    if (result.status === 'available') {
      const blob = new Blob(
        [result.content],
        {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.metadata.name ?? 'estudio-de-titulos.docx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setHistoryMessage('Informe disponible: se preparó la descarga.');
      return;
    }
    if (result.status === 'not-found') {
      setHistoryMessage('El informe ya no existe en Firestore.');
      return;
    }
    if (result.status === 'stale') {
      setHistoryMessage(
        result.reason === 'not-found'
          ? 'El informe conserva metadata, pero su archivo Drive está obsoleto.'
          : 'El informe conserva metadata, pero su archivo Drive no está disponible.',
      );
      return;
    }
    if (result.status === 'authorization-required') {
      setHistoryMessage('Drive requiere autorización para abrir el informe.');
      return;
    }
    setHistoryMessage('No fue posible abrir el informe.');
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
          ['resultado', 'Resultado'],
          ['informe', 'Informe'],
          ['historial', 'Historial'],
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
            {onOpenApisModels && (
              <button
                type="button"
                className="btn-secondary"
                onClick={onOpenApisModels}
              >
                APIs y modelos
              </button>
            )}
            {onOpenReports && (
              <button
                type="button"
                className="btn-secondary"
                onClick={onOpenReports}
              >
                Mis informes
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

      {activeTab === 'resultado' && (
        <section className="workspace-panel" aria-labelledby="workspace-result-title">
          <h3 id="workspace-result-title">Resultado</h3>
          <p>
            El análisis usa únicamente documentos persistidos del proyecto.
            Sólo se muestra un resultado que cumple TITLE_STUDY; su metadata se
            confirma después de guardar el JSON en Drive.
          </p>
          <div className="project-state-card">
            Configuración AI: clave {services.aiCredentials.get() ? 'cargada en memoria' : 'no cargada'} ·
            instrucción adicional {services.aiInstruction.get() ? 'activa' : 'vacía'}.
          </div>

          <div className="workspace-actions">
            <button
              type="button"
              className="btn-primary"
              disabled={analysisPending || documents.length === 0}
              onClick={() => void analyzePersistedDocuments()}
            >
              {analysisPending ? 'Analizando…' : 'Analizar documentos persistidos'}
            </button>
            {documents.length === 0 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setActiveTab('documentos');
                  void refreshDocuments();
                }}
              >
                Ir a Documentos
              </button>
            )}
          </div>

          {analysisMetadataId && (
            <div className="project-state-card" role="status">
              Análisis validado y persistido. Metadata: {analysisMetadataId}
            </div>
          )}
          {analysisError && (
            <div className="project-error" role="alert">
              {analysisError}
              {analysisReport
                ? ' El JSON mostrado es válido, pero no debe interpretarse como persistido.'
                : ''}
            </div>
          )}
          {analysisReport && (
            <TitleStudyResult report={analysisReport} partial={false} />
          )}
        </section>
      )}

      {activeTab === 'informe' && (
        <section className="workspace-panel" aria-labelledby="workspace-report-title">
          <h3 id="workspace-report-title">Informe</h3>
          <p>
            El DOCX sólo se genera desde un análisis TITLE_STUDY validado y
            persistido. Drive debe confirmar el archivo antes de guardar su metadata.
          </p>
          <div className="workspace-actions">
            <button
              type="button"
              className="btn-primary"
              disabled={reportPending || !analysisReport || !analysisMetadataId}
              onClick={() => void generateAndPersistReport()}
            >
              {reportPending ? 'Generando y guardando…' : 'Generar y persistir DOCX'}
            </button>
            {!analysisMetadataId && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setActiveTab('resultado')}
              >
                Ir a Resultado
              </button>
            )}
          </div>
          {reportMetadataId && (
            <div className="project-state-card" role="status">
              Informe confirmado en Drive y metadata persistida: {reportMetadataId}
            </div>
          )}
          {reportError && (
            <div className="project-error" role="alert">{reportError}</div>
          )}
        </section>
      )}

      {activeTab === 'historial' && (
        <section className="workspace-panel" aria-labelledby="workspace-history-title">
          <h3 id="workspace-history-title">Historial</h3>
          <p>
            Reapertura controlada de análisis e informes persistidos.
          </p>
          <div className="workspace-actions">
            <button
              type="button"
              className="btn-secondary"
              disabled={historyStatus === 'loading'}
              onClick={() => void refreshHistory()}
            >
              Actualizar historial
            </button>
          </div>
          {historyMessage && (
            <div
              className={historyStatus === 'failure' ? 'project-error' : 'project-state-card'}
              role={historyStatus === 'failure' ? 'alert' : 'status'}
            >
              {historyMessage}
            </div>
          )}
          {historyStatus === 'loading' && (
            <div className="project-state-card">Cargando historial…</div>
          )}
          {historyStatus === 'empty' && (
            <div className="project-state-card">
              No hay análisis ni informes persistidos.
            </div>
          )}
          {(historyStatus === 'loaded' || historyStatus === 'failure') && (
            <div className="workspace-history-grid">
              <section>
                <h4>Análisis</h4>
                {analysisHistory.length === 0 ? (
                  <p className="guest-empty-state">Sin análisis persistidos.</p>
                ) : (
                  <ul className="workspace-list">
                    {analysisHistory.map((item) => (
                      <li key={item.id}>
                        <div>
                          <strong>{item.name ?? item.id}</strong>
                          <span>{item.id}</span>
                        </div>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => void reopenAnalysis(item.id)}
                        >
                          Reabrir análisis
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section>
                <h4>Informes</h4>
                {reportHistory.length === 0 ? (
                  <p className="guest-empty-state">Sin informes persistidos.</p>
                ) : (
                  <ul className="workspace-list">
                    {reportHistory.map((item) => (
                      <li key={item.id}>
                        <div>
                          <strong>{item.name ?? item.id}</strong>
                          <span>{item.id}</span>
                        </div>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => void reopenReport(item.id)}
                        >
                          Abrir informe
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </section>
      )}
    </section>
  );
}
