import type {
  AuthDriver,
  AuthIdentity,
  AuthService,
  AuthSession,
  FirebaseUserLike,
} from './types.js';

export function adaptFirebaseUser(user: FirebaseUserLike | null): AuthSession {
  if (!user) {
    return { status: 'unauthenticated' };
  }

  const identity: AuthIdentity = {
    uid: user.uid,
    displayName: user.displayName ?? null,
    email: user.email ?? null,
    photoURL: user.photoURL ?? null,
  };

  return { status: 'authenticated', user: identity };
}

export function createAuthService(driver: AuthDriver): AuthService {
  return {
    observe(listener, onError) {
      return driver.observe(
        (user) => listener(adaptFirebaseUser(user)),
        onError,
      );
    },

    async signInWithGoogle() {
      const user = await driver.signInWithGoogle();
      return adaptFirebaseUser(user);
    },

    async signOut() {
      await driver.signOut();
    },
  };
}

function authErrorCode(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
  ) {
    return (error as { code: string }).code;
  }

  return null;
}

export function authErrorMessage(error: unknown, action: 'sign-in' | 'sign-out' | 'observe') {
  const code = authErrorCode(error);

  if (action === 'sign-in') {
    if (code === 'auth/popup-closed-by-user') {
      return 'Inicio de sesión cancelado.';
    }
    if (code === 'auth/popup-blocked') {
      return 'El navegador bloqueó la ventana de inicio de sesión de Google.';
    }
    if (code === 'auth/unauthorized-domain') {
      return 'Este dominio todavía no está autorizado para iniciar sesión con Google.';
    }
    return 'No fue posible iniciar sesión con Google.';
  }

  if (action === 'sign-out') {
    return 'No fue posible cerrar la sesión.';
  }

  return 'No fue posible recuperar el estado de la sesión. El modo invitado sigue disponible.';
}
