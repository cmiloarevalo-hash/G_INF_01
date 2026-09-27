import type { FirebaseConfigResolution } from './config.js';
import { authErrorMessage, createAuthService } from './service.js';
import type { AuthDriver, AuthService, AuthSessionState } from './types.js';

export type AuthPendingAction = 'sign-in' | 'sign-out' | null;

export interface AuthSessionSnapshot {
  available: boolean;
  session: AuthSessionState;
  pendingAction: AuthPendingAction;
  errorMessage: string | null;
  unavailableReason?: string;
}

export interface AuthSessionController {
  getSnapshot(): AuthSessionSnapshot;
  subscribe(listener: () => void): () => void;
  start(): Promise<void>;
  stop(): void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
}

export type AuthDriverFactory = (
  config: Extract<FirebaseConfigResolution, { available: true }>['config'],
) => AuthDriver;

export interface AuthSessionControllerOptions {
  initialResolution: FirebaseConfigResolution;
  loadResolution: () => Promise<FirebaseConfigResolution>;
  driverFactory: AuthDriverFactory;
}

interface AuthRuntime {
  available: boolean;
  service: AuthService | null;
  unavailableReason?: string;
}

export function createAuthRuntime(
  resolution: FirebaseConfigResolution,
  driverFactory: AuthDriverFactory,
): AuthRuntime {
  if (!resolution.available) {
    return {
      available: false,
      service: null,
      unavailableReason: `Falta configuración Firebase: ${resolution.missing.join(', ')}`,
    };
  }

  try {
    return {
      available: true,
      service: createAuthService(driverFactory(resolution.config)),
    };
  } catch {
    return {
      available: false,
      service: null,
      unavailableReason: 'La configuración Firebase no pudo inicializarse.',
    };
  }
}

function snapshotForRuntime(runtime: AuthRuntime): AuthSessionSnapshot {
  return {
    available: runtime.available,
    session: runtime.available ? { status: 'checking' } : { status: 'unauthenticated' },
    pendingAction: null,
    errorMessage: null,
    unavailableReason: runtime.unavailableReason,
  };
}

export function createAuthSessionController(
  options: AuthSessionControllerOptions,
): AuthSessionController {
  let runtime = createAuthRuntime(options.initialResolution, options.driverFactory);
  let snapshot = snapshotForRuntime(runtime);
  let unsubscribe: (() => void) | null = null;
  let started = false;
  let generation = 0;
  let runtimeLoad: Promise<FirebaseConfigResolution> | null = null;
  const listeners = new Set<() => void>();

  const emit = (next: AuthSessionSnapshot) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };

  const patch = (updates: Partial<AuthSessionSnapshot>) => {
    emit({ ...snapshot, ...updates });
  };

  const attachObserver = () => {
    if (!runtime.service || unsubscribe) return;

    unsubscribe = runtime.service.observe(
      (session) => {
        patch({ session, errorMessage: null });
      },
      (error) => {
        patch({
          session: { status: 'unauthenticated' },
          errorMessage: authErrorMessage(error, 'observe'),
        });
      },
    );
  };

  const setRuntime = (nextRuntime: AuthRuntime) => {
    unsubscribe?.();
    unsubscribe = null;
    runtime = nextRuntime;
    emit(snapshotForRuntime(runtime));
    if (started) attachObserver();
  };

  const controller: AuthSessionController = {
    getSnapshot() {
      return snapshot;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async start() {
      if (started) return;
      started = true;
      const activeGeneration = ++generation;

      if (runtime.service) {
        attachObserver();
        return;
      }

      if (options.initialResolution.available) return;

      runtimeLoad ??= options.loadResolution();
      const resolution = await runtimeLoad;
      if (!started || generation !== activeGeneration) return;

      setRuntime(createAuthRuntime(resolution, options.driverFactory));
    },

    stop() {
      if (!started) return;
      started = false;
      generation += 1;
      unsubscribe?.();
      unsubscribe = null;
    },

    async signIn() {
      if (!runtime.service || snapshot.pendingAction) return;

      patch({ pendingAction: 'sign-in', errorMessage: null });
      try {
        const session = await runtime.service.signInWithGoogle();
        patch({ session });
      } catch (error) {
        patch({ errorMessage: authErrorMessage(error, 'sign-in') });
      } finally {
        patch({ pendingAction: null });
      }
    },

    async signOut() {
      if (!runtime.service || snapshot.pendingAction) return;

      patch({ pendingAction: 'sign-out', errorMessage: null });
      try {
        await runtime.service.signOut();
        patch({ session: { status: 'unauthenticated' } });
      } catch (error) {
        patch({ errorMessage: authErrorMessage(error, 'sign-out') });
      } finally {
        patch({ pendingAction: null });
      }
    },
  };

  return controller;
}
