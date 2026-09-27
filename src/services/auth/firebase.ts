import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
} from 'firebase/auth';
import type { FirebaseWebConfig } from './config.js';
import type { AuthDriver } from './types.js';

function getOrInitializeApp(config: FirebaseWebConfig): FirebaseApp {
  const existing = getApps().find((app) => app.options.appId === config.appId);
  if (existing) {
    return existing;
  }

  if (getApps().length === 1) {
    const defaultApp = getApp();
    if (defaultApp.options.appId === config.appId) {
      return defaultApp;
    }
  }

  return initializeApp(config);
}

export function createFirebaseAuthDriver(config: FirebaseWebConfig): AuthDriver {
  const app = getOrInitializeApp(config);
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
