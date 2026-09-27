import * as React from 'react';
import { useAuthSession } from '../services/auth/context.js';

export const AuthSessionControl: React.FC = () => {
  const {
    available,
    unavailableReason,
    session,
    pendingAction,
    errorMessage,
    signIn,
    signOut,
  } = useAuthSession();

  if (!available) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} title={unavailableReason}>
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
          onClick={() => void signOut()}
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
        onClick={() => void signIn()}
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
