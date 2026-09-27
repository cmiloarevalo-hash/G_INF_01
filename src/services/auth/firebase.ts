import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
} from 'firebase/auth';
import { getOrInitializeFirebaseApp } from '../firebase/app.js';
import type { FirebaseWebConfig } from './config.js';
import type { AuthDriver } from './types.js';

export function createFirebaseAuthDriver(config: FirebaseWebConfig): AuthDriver {
  const app = getOrInitializeFirebaseApp(config);
  const auth: Auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  return {
    observe(listener, onError) {
      return onAuthStateChanged(auth, listener, onError);
    },

    async signInWithGoogle() {
      const credential = await signInWithPopup(auth, provider);
      return credential.user;
    },

    async signOut() {
      await signOut(auth);
    },
  };
}
