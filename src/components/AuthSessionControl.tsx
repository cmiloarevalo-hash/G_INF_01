import * as React from 'react';
import {
  loadBrowserFirebaseConfig,
  resolveBrowserFirebaseConfig,
  type FirebaseConfigResolution,
} from '../services/auth/config.js';
import { createFirebaseAuthDriver } from '../services/auth/firebase.js';
import { authErrorMessage, createAuthService } from '../services/auth/service.js';
import type { AuthDriver, AuthService, AuthSessionState } from '../services/auth/types.js';

interface AuthRuntime {
  available: boolean;
  service: AuthService | null;
  unavailableReason?: string;
}

type AuthDriverFactory = (config: Extract<FirebaseConfigResolution, { available: true }>['config']) => AuthDriver;

export function createAuthRuntime(
  resolution: FirebaseConfigResolution,
  driverFactory: AuthDriverFactory = createFirebaseAuthDriver,
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

export const AuthSessionControl: React.FC = () => {
  const initialResolution = React.useMemo(
    () => resolveBrowserFirebaseConfig(),
    [],
  );
  const [runtime, setRuntime] = React.useState<AuthRuntime>(
    () => createAuthRuntime(initialResolution),
  );
  const [session, setSession] = React.useState<AuthSessionState>(
    runtime.available ? { status: 'checking' } : { status: 'unauthenticated' },
  );
  const [pendingAction, setPendingAction] = React.useState<'sign-in' | 'sign-out' | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialResolution.available) return;

    let active = true;
    void loadBrowserFirebaseConfig().then((resolution) => {
      if (!active) return;
      const nextRuntime = createAuthRuntime(resolution);
      setRuntime(nextRuntime);
      setSession(nextRuntime.available ? { status: 'checking' } : { status: 'unauthenticated' });
    });

    return () => {
      active = false;
    };
  }, [initialResolution]);

  React.useEffect(() => {
    if (!runtime.service) return;

    return runtime.service.observe(
      (nextSession) => {
        setSession(nextSession);
        setErrorMessage(null);
      },
      (error) => {
        setSession({ status: 'unauthenticated' });
        setErrorMessage(authErrorMessage(error, 'observe'));
      },
    );
  }, [runtime]);

  const signIn = async () => {
    if (!runtime.service || pendingAction) return;

    setPendingAction('sign-in');
    setErrorMessage(null);

    try {
      const nextSession = await runtime.service.signInWithGoogle();
      setSession(nextSession);
    } catch (error) {
      setErrorMessage(authErrorMessage(error, 'sign-in'));
    } finally {
      setPendingAction(null);
    }
  };

  const signOutSession = async () => {
    if (!runtime.service || pendingAction) return;

    setPendingAction('sign-out');
    setErrorMessage(null);

    try {
      await runtime.service.signOut();
      setSession({ status: 'unauthenticated' });
    } catch (error) {
      setErrorMessage(authErrorMessage(error, 'sign-out'));
    } finally {
      setPendingAction(null);
    }
  };

  if (!runtime.available) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} title={runtime.unavailableReason}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Modo invitado</span>
        <button type="button" className="btn-secondary" disabled>
          Google no configurado
        </button>
      </div>
    );
  }

  if (session.status === 'authenticated') {
    const visibleName = session.user.displayName || session.user.email || 'Cuenta Google';

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
        {session.user.photoURL && (
          <img
            src={session.user.photoURL}
            alt=""
            referrerPolicy="no-referrer"
            style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
          />
        )}
        <span
          title={session.user.email ?? session.user.uid}
          style={{
            maxWidth: '12rem',
            overflow: 'hidden',
            color: 'var(--text-main)',
            fontSize: '0.75rem',
            fontWeight: 600,
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {visibleName}
        </span>
        <button
          type="button"
          className="btn-secondary"
          onClick={signOutSession}
          disabled={pendingAction !== null}
        >
          {pendingAction === 'sign-out' ? 'Saliendo…' : 'Cerrar sesión'}
        </button>
        {errorMessage && (
          <span role="alert" style={{ color: '#fecaca', fontSize: '0.72rem' }}>
            {errorMessage}
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
        {session.status === 'checking' ? 'Verificando sesión…' : 'Modo invitado'}
      </span>
      <button
        type="button"
        className="btn-secondary"
        onClick={signIn}
        disabled={session.status === 'checking' || pendingAction !== null}
      >
        {pendingAction === 'sign-in' ? 'Abriendo Google…' : 'Entrar con Google'}
      </button>
      {errorMessage && (
        <span role="alert" style={{ color: '#fecaca', fontSize: '0.72rem' }}>
          {errorMessage}
        </span>
      )}
    </div>
  );
};
