import type { AuthSessionState } from '../services/auth/types.js';
import type {
  AuthenticatedProjectService,
} from '../services/firestore/authenticated.js';
import type { ProjectRuntimeState } from '../services/firestore/runtime.js';
import type { ProjectMetadata } from '../services/firestore/types.js';

export type ProjectUiAvailability =
  | { status: 'checking-session' }
  | { status: 'sign-in-required' }
  | { status: 'checking-runtime' }
  | { status: 'runtime-unavailable'; reason: string }
  | { status: 'ready'; service: AuthenticatedProjectService };

export function projectUiAvailability(
  session: AuthSessionState,
  runtime: ProjectRuntimeState,
): ProjectUiAvailability {
  if (session.status === 'checking') return { status: 'checking-session' };
  if (session.status === 'unauthenticated') return { status: 'sign-in-required' };
  if (runtime.status === 'checking') return { status: 'checking-runtime' };
  if (runtime.status === 'unavailable') {
    return { status: 'runtime-unavailable', reason: runtime.reason };
  }
  return { status: 'ready', service: runtime.service };
}

export interface SingleFlightGate {
  run<T>(operation: () => Promise<T>): Promise<
    | { status: 'completed'; value: T }
    | { status: 'ignored-pending' }
  >;
  isPending(): boolean;
}

export function createSingleFlightGate(): SingleFlightGate {
  let pending = false;

  return {
    async run(operation) {
      if (pending) return { status: 'ignored-pending' };
      pending = true;
      try {
        return { status: 'completed', value: await operation() };
      } finally {
        pending = false;
      }
    },

    isPending() {
      return pending;
    },
  };
}

export async function createProjectForUi(
  session: AuthSessionState,
  runtime: ProjectRuntimeState,
  name: string,
): Promise<ProjectMetadata> {
  const availability = projectUiAvailability(session, runtime);
  if (availability.status !== 'ready') {
    throw new Error('La persistencia de proyectos no está disponible.');
  }
  return availability.service.create(session, name);
}

export async function listProjectsForUi(
  session: AuthSessionState,
  runtime: ProjectRuntimeState,
): Promise<ProjectMetadata[]> {
  const availability = projectUiAvailability(session, runtime);
  if (availability.status !== 'ready') return [];
  return availability.service.list(session);
}

export async function reopenProjectForUi(
  session: AuthSessionState,
  runtime: ProjectRuntimeState,
  projectId: string,
): Promise<ProjectMetadata | null> {
  const availability = projectUiAvailability(session, runtime);
  if (availability.status !== 'ready') {
    throw new Error('La persistencia de proyectos no está disponible.');
  }
  return availability.service.get(session, projectId);
}
