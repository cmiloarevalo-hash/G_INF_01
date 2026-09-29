import * as React from 'react';
import { useAuthSession } from '../services/auth/context.js';
import { useProductRuntime } from '../services/application/product-runtime.js';
import type { ProjectReportMetadata } from '../services/firestore/artifacts.js';

interface ReportRow {
  projectId: string;
  projectName: string;
  report: ProjectReportMetadata;
}

type ReportsState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'loaded'; rows: ReportRow[] }
  | { status: 'failure'; message: string; rows: ReportRow[] };

export function ReportsPage() {
  const { session } = useAuthSession();
  const runtime = useProductRuntime();
  const [state, setState] = React.useState<ReportsState>({ status: 'loading' });
  const [message, setMessage] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (runtime.status !== 'available' || session.status !== 'authenticated') {
      return;
    }

    setState({ status: 'loading' });
    setMessage(null);
    try {
      const projects = await runtime.services.projects.list(session);
      const results = await Promise.allSettled(
        projects.map(async (project) => ({
          project,
          reports: await runtime.services.reports.list(session, project.id),
        })),
      );

      const rows: ReportRow[] = [];
      let failures = 0;
      for (const result of results) {
        if (result.status === 'rejected') {
          failures += 1;
          continue;
        }
        for (const report of result.value.reports) {
          rows.push({
            projectId: result.value.project.id,
            projectName: result.value.project.name,
            report,
          });
        }
      }

      if (failures > 0) {
        setState({
          status: 'failure',
          message: 'No fue posible consultar los informes de todos los proyectos.',
          rows,
        });
      } else if (rows.length === 0) {
        setState({ status: 'empty' });
      } else {
        setState({ status: 'loaded', rows });
      }
    } catch (error) {
      setState({
        status: 'failure',
        message: error instanceof Error
          ? error.message
          : 'No fue posible consultar Mis informes.',
        rows: [],
      });
    }
  }, [runtime, session]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  if (session.status !== 'authenticated') {
    return (
      <div className="project-state-card">
        Inicia sesión con Google para consultar informes persistidos.
      </div>
    );
  }
  if (runtime.status === 'checking') {
    return <div className="project-state-card">Preparando historial de informes…</div>;
  }
  if (runtime.status === 'unavailable') {
    return (
      <div className="project-state-card">
        <strong>Mis informes no está disponible.</strong>
        <span>{runtime.reason}</span>
      </div>
    );
  }

  const services = runtime.services;

  const authorizeDrive = async () => {
    try {
      await services.driveAuthorization.authorize();
      setMessage('Google Drive autorizado para esta sesión.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No fue posible autorizar Google Drive.',
      );
    }
  };

  const openReport = async (row: ReportRow) => {
    setMessage('Abriendo informe…');
    const result = await services.history.reopenReport(
      session,
      row.projectId,
      row.report.id,
    );

    if (result.status === 'authorization-required') {
      setMessage('Drive requiere autorización para abrir este informe.');
      return;
    }
    if (result.status === 'not-found') {
      setMessage('La metadata del informe ya no está disponible.');
      return;
    }
    if (result.status === 'stale') {
      setMessage(
        result.reason === 'not-found'
          ? 'La metadata existe, pero el archivo Drive fue eliminado o quedó obsoleto.'
          : 'La metadata existe, pero el archivo Drive no está accesible.',
      );
      return;
    }
    if (result.status === 'failure') {
      setMessage('No fue posible reabrir el informe.');
      return;
    }

    const blob = new Blob([result.content], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.metadata.name ?? 'estudio-de-titulos.docx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage('Informe disponible: se preparó la descarga.');
  };

  const rows = state.status === 'loaded' || state.status === 'failure'
    ? state.rows
    : [];

  return (
    <section className="project-page" aria-labelledby="reports-title">
      <div className="project-page-heading">
        <span className="hero-tag">M4.4c</span>
        <h2 id="reports-title">Mis informes</h2>
        <p>
          Informes persistidos por proyecto. Una referencia Drive obsoleta se
          informa sin eliminar ni inventar contenido.
        </p>
      </div>

      <div className="workspace-actions">
        <button type="button" className="btn-secondary" onClick={() => void refresh()}>
          Actualizar
        </button>
        {!services.driveAuthorization.getAccessToken() && (
          <button type="button" className="btn-secondary" onClick={() => void authorizeDrive()}>
            Autorizar Drive
          </button>
        )}
      </div>

      {message && <div className="project-state-card" role="status">{message}</div>}
      {state.status === 'loading' && (
        <div className="project-state-card">Cargando informes…</div>
      )}
      {state.status === 'empty' && (
        <div className="project-state-card">Todavía no hay informes persistidos.</div>
      )}
      {state.status === 'failure' && (
        <div className="project-error" role="alert">{state.message}</div>
      )}

      {rows.length > 0 && (
        <ul className="workspace-list">
          {rows.map((row) => (
            <li key={`${row.projectId}:${row.report.id}`}>
              <div>
                <strong>{row.report.name ?? row.report.id}</strong>
                <span>Proyecto: {row.projectName}</span>
                <span>{row.report.mimeType ?? 'DOCX'}</span>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void openReport(row)}
              >
                Abrir informe
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
