import * as React from 'react';
import {
  loadBrowserFirebaseConfig,
  resolveBrowserFirebaseConfig,
} from './config.js';
import { createFirebaseAuthDriver } from './firebase.js';
import {
  createAuthSessionController,
  type AuthSessionController,
  type AuthSessionSnapshot,
} from './session.js';

export interface AuthSessionContextValue extends AuthSessionSnapshot {
  signIn(): Promise<void>;
  signOut(): Promise<void>;
}

const AuthSessionContext = React.createContext<AuthSessionContextValue | null>(null);

export interface AuthSessionProviderProps {
  children?: React.ReactNode;
  controller?: AuthSessionController;
}

function createBrowserAuthSessionController(): AuthSessionController {
  return createAuthSessionController({
    initialResolution: resolveBrowserFirebaseConfig(),
    loadResolution: loadBrowserFirebaseConfig,
    driverFactory: createFirebaseAuthDriver,
  });
}

export function AuthSessionProvider({
  children,
  controller: providedController,
}: AuthSessionProviderProps) {
  const [controller] = React.useState(
    () => providedController ?? createBrowserAuthSessionController(),
  );

  React.useEffect(() => {
    void controller.start();
    return () => controller.stop();
  }, [controller]);

  const snapshot = React.useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  const value = React.useMemo<AuthSessionContextValue>(
    () => ({
      ...snapshot,
      signIn: controller.signIn,
      signOut: controller.signOut,
    }),
    [controller, snapshot],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession(): AuthSessionContextValue {
  const value = React.useContext(AuthSessionContext);
  if (!value) {
    throw new Error('useAuthSession debe usarse dentro de AuthSessionProvider.');
  }
  return value;
}
