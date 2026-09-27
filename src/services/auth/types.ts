export interface AuthIdentity {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export type AuthSession =
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: AuthIdentity };

export type AuthSessionState = { status: 'checking' } | AuthSession;

export interface FirebaseUserLike {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}

export interface AuthDriver {
  observe(
    listener: (user: FirebaseUserLike | null) => void,
    onError?: (error: unknown) => void,
  ): () => void;
  signInWithGoogle(): Promise<FirebaseUserLike>;
  signOut(): Promise<void>;
}

export interface AuthService {
  observe(
    listener: (session: AuthSession) => void,
    onError?: (error: unknown) => void,
  ): () => void;
  signInWithGoogle(): Promise<AuthSession>;
  signOut(): Promise<void>;
}
