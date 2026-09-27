import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import type { FirebaseWebConfig } from '../auth/config.js';

export function getOrInitializeFirebaseApp(config: FirebaseWebConfig): FirebaseApp {
  const existing = getApps().find((app) => app.options.appId === config.appId);
  if (existing) return existing;

  if (getApps().length === 1) {
    const defaultApp = getApp();
    if (defaultApp.options.appId === config.appId) return defaultApp;
  }

  return initializeApp(config);
}
