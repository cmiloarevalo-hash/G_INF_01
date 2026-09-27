import * as React from 'react';
import { useAuthSession } from '../services/auth/context.js';
import { useProjectRuntime } from '../services/firestore/runtime.js';
import type { ProjectMetadata } from '../services/firestore/types.js';
import {
  listProjectsForUi,
  projectUiAvailability,
  reopenProjectForUi,
} from './projectFlow.js';
import { ProjectMetadataCard } from './ProjectMetadataCard.js';

type ListState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'loaded'; projects: ProjectMetadata[] }
  | { status: 'error'; message: string };

type SelectedState =
  | { status: 'idle' }
  | { status: 'loading'; projectId: string }
  | { status: 'selected'; project: ProjectMetadata }
  | { status: 'not-found'; projectId: string }
  | { status: 'error'; message: string };

export function ProjectListContent({
  state,
  onSelect,
}: {
  state: ListState;
  onSelect: (projectId: string) => void;
}) {
  if (state.status === 'loading') {
    return <div className="project-state-card">Cargando proyectos…</div>;
  }
  if (state.status === 'empty') {
    return <div className="project-state-card">Todavía no hay proyectos persistidos.</div>;
  }
  if (state.status === 'error') {
    return <div className="project-error" role="alert">{state.message}</div>;
  }
  if (state.status !== 'loaded') return null;

  return (
    <ul className="project-list">
      {state.projects.map((project) => (
        <li key={project.id}>
          <ProjectMetadataCard project={project} />
          <button
            type="button"
            className="btn-secondary project-open-button"
            onClick={() => onSelect(project.id)}
          >
            Reabrir proyecto
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ProjectsPage() {
  const { session } = useAuthSession();
  const runtime = useProjectRuntime();
  const availability = projectUiAvailability(session, runtime);
  const [listState, setListState] = React.useState<ListState>({ status: 'idle' });
  const [selected, setSelected] = React.useState<SelectedState>({ status: 'idle' });

  React.useEffect(() => {
    if (availability.status !== 'ready') {
      setListState({ status: 'idle' });
      setSelected({ status: 'idle' });
      return;
    }

    let active = true;
    setListState({ status: 'loading' });
    void listProjectsForUi(session, runtime)
      .then((projects) => {
        if (!active) return;
        setListState(
          projects.length === 0
            ? { status: 'empty' }
            : { status: 'loaded', projects },
        );
      })
      .catch((cause) => {
        if (!active) return;
        setListState({
          status: 'error',
          message: cause instanceof Error ? cause.message : 'No fue posible cargar los proyectos.',
        });
      });

    return () => {
      active = false;
    };
  }, [availability.status, runtime, session]);

  if (availability.status === 'checking-session') {
    return <div className="project-state-card">Verificando sesión…</div>;
  }
  if (availability.status === 'sign-in-required') {
    return (
      <div className="project-state-card">
        Inicia sesión con Google para ver tus proyectos persistentes.
      </div>
    );
  }
  if (availability.status === 'checking-runtime') {
    return <div className="project-state-card">Preparando persistencia de proyectos…</div>;
  }
  if (availability.status === 'runtime-unavailable') {
    return (
      <div className="project-state-card">
        <strong>Persistencia de proyectos no disponible.</strong>
        <span>{availability.reason}</span>
      </div>
    );
  }

  const reopen = async (projectId: string) => {
    setSelected({ status: 'loading', projectId });
    try {
      const project = await reopenProjectForUi(session, runtime, projectId);
      setSelected(
        project
          ? { status: 'selected', project }
          : { status: 'not-found', projectId },
      );
    } catch (cause) {
      setSelected({
        status: 'error',
        message: cause instanceof Error ? cause.message : 'No fue posible reabrir el proyecto.',
      });
    }
  };

  return (
    <section className="project-page" aria-labelledby="projects-title">
      <div className="project-page-heading">
        <span className="hero-tag">Proyectos autenticados</span>
        <h2 id="projects-title">Mis proyectos</h2>
        <p>Lista persistida de metadata asociada a tu sesión actual.</p>
      </div>

      <ProjectListContent state={listState} onSelect={(id) => void reopen(id)} />

      {selected.status === 'loading' && (
        <div className="project-state-card">Reabriendo proyecto…</div>
      )}
      {selected.status === 'not-found' && (
        <div className="project-state-card" role="status">
          El proyecto {selected.projectId} ya no está disponible.
        </div>
      )}
      {selected.status === 'error' && (
        <div className="project-error" role="alert">{selected.message}</div>
      )}
      {selected.status === 'selected' && (
        <div className="project-result" aria-live="polite">
          <strong>Proyecto reabierto.</strong>
          <ProjectMetadataCard project={selected.project} />
        </div>
      )}
    </section>
  );
}
