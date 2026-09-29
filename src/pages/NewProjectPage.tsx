import * as React from 'react';
import { useAuthSession } from '../services/auth/context.js';
import { useProjectRuntime } from '../services/firestore/runtime.js';
import type { ProjectMetadata } from '../services/firestore/types.js';
import {
  createProjectForUi,
  createSingleFlightGate,
  projectUiAvailability,
} from './projectFlow.js';
import { ProjectMetadataCard } from './ProjectMetadataCard.js';

export function NewProjectPage({
  onCreated,
}: {
  onCreated?: (project: ProjectMetadata) => void;
} = {}) {
  const { session } = useAuthSession();
  const runtime = useProjectRuntime();
  const availability = projectUiAvailability(session, runtime);
  const gate = React.useRef(createSingleFlightGate());
  const [name, setName] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [created, setCreated] = React.useState<ProjectMetadata | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  if (availability.status === 'checking-session') {
    return <div className="project-state-card">Verificando sesión…</div>;
  }
  if (availability.status === 'sign-in-required') {
    return (
      <div className="project-state-card">
        Inicia sesión con Google para crear proyectos persistentes.
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (gate.current.isPending()) return;

    setPending(true);
    setError(null);
    const result = await gate.current.run(() => createProjectForUi(session, runtime, name));
    try {
      if (result.status === 'completed') {
        setCreated(result.value);
        setName('');
        onCreated?.(result.value);
      }
    } catch {
      // unreachable: errors reject before a completed result is returned
    } finally {
      setPending(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    try {
      await handleSubmit(event);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible crear el proyecto.');
      setPending(false);
    }
  };

  return (
    <section className="project-page" aria-labelledby="new-project-title">
      <div className="project-page-heading">
        <span className="hero-tag">Proyectos autenticados</span>
        <h2 id="new-project-title">Nuevo proyecto</h2>
        <p>La identidad propietaria se deriva exclusivamente de la sesión autenticada.</p>
      </div>

      <form className="project-form" onSubmit={(event) => void submit(event)}>
        <label htmlFor="project-name">Nombre del proyecto</label>
        <input
          id="project-name"
          name="projectName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={pending}
          autoComplete="off"
        />
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Creando…' : 'Crear proyecto'}
        </button>
      </form>

      {error && <div className="project-error" role="alert">{error}</div>}
      {created && (
        <div className="project-result" aria-live="polite">
          <strong>Proyecto creado.</strong>
          <ProjectMetadataCard project={created} />
        </div>
      )}
    </section>
  );
}
