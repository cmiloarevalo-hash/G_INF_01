import * as React from 'react';
import {
  loadBrowserFirebaseConfig,
  resolveBrowserFirebaseConfig,
  type FirebaseConfigResolution,
  type FirebaseWebConfig,
} from '../auth/config.js';
import {
  createAuthenticatedProjectService,
  type AuthenticatedProjectService,
} from './authenticated.js';
import { createFirestoreProjectDriver } from './firebase.js';
import { createProjectRepository } from './service.js';

export type ProjectRuntimeState =
  | { status: 'checking' }
  | { status: 'unavailable'; reason: string }
  | { status: 'available'; service: AuthenticatedProjectService };

export type ProjectServiceFactory = (config: FirebaseWebConfig) => AuthenticatedProjectService;

export function createProjectService(config: FirebaseWebConfig): AuthenticatedProjectService {
  return createAuthenticatedProjectService(
    createProjectRepository(createFirestoreProjectDriver(config)),
  );
}

export function resolveProjectRuntime(
  resolution: FirebaseConfigResolution,
  serviceFactory: ProjectServiceFactory = createProjectService,
): ProjectRuntimeState {
  if (!resolution.available) {
    return {
      status: 'unavailable',
      reason: `Falta configuración Firebase: ${resolution.missing.join(', ')}`,
    };
  }

  try {
    return {
      status: 'available',
      service: serviceFactory(resolution.config),
    };
  } catch {
    return {
      status: 'unavailable',
      reason: 'La persistencia de proyectos no pudo inicializarse.',
    };
  }
}

export async function loadProjectRuntime(
  loadResolution: () => Promise<FirebaseConfigResolution>,
  serviceFactory: ProjectServiceFactory = createProjectService,
): Promise<ProjectRuntimeState> {
  try {
    return resolveProjectRuntime(await loadResolution(), serviceFactory);
  } catch {
    return {
      status: 'unavailable',
      reason: 'No fue posible cargar la configuración Firebase para proyectos.',
    };
  }
}

const ProjectRuntimeContext = React.createContext<ProjectRuntimeState | null>(null);

export interface ProjectRuntimeProviderProps {
  children?: React.ReactNode;
  initialState?: ProjectRuntimeState;
  loadResolution?: () => Promise<FirebaseConfigResolution>;
  serviceFactory?: ProjectServiceFactory;
}

export function ProjectRuntimeProvider({
  children,
  initialState,
  loadResolution = loadBrowserFirebaseConfig,
  serviceFactory = createProjectService,
}: ProjectRuntimeProviderProps) {
  const buildTimeResolution = React.useMemo(
    () => initialState ? null : resolveBrowserFirebaseConfig(),
    [initialState],
  );
  const [runtime, setRuntime] = React.useState<ProjectRuntimeState>(() => {
    if (initialState) return initialState;
    if (buildTimeResolution?.available) {
      return resolveProjectRuntime(buildTimeResolution, serviceFactory);
    }
    return { status: 'checking' };
  });

  React.useEffect(() => {
    if (initialState || buildTimeResolution?.available) return;

    let active = true;
    void loadProjectRuntime(loadResolution, serviceFactory).then((nextRuntime) => {
      if (!active) return;
      setRuntime(nextRuntime);
    });

    return () => {
      active = false;
    };
  }, [buildTimeResolution, initialState, loadResolution, serviceFactory]);

  return (
    <ProjectRuntimeContext.Provider value={runtime}>
      {children}
    </ProjectRuntimeContext.Provider>
  );
}

export function useProjectRuntime(): ProjectRuntimeState {
  const value = React.useContext(ProjectRuntimeContext);
  if (!value) {
    throw new Error('useProjectRuntime debe usarse dentro de ProjectRuntimeProvider.');
  }
  return value;
}
