import { getFirestore, type Firestore } from 'firebase/firestore';
import type { FirebaseApp } from 'firebase/app';
import type { FirebaseWebConfig } from '../auth/config.js';
import { getOrInitializeFirebaseApp } from '../firebase/app.js';

export interface FirestoreSelector<TApp, TDatabase> {
  (app: TApp): TDatabase;
  (app: TApp, databaseId: string): TDatabase;
}

export function selectFirestoreDatabase<TApp, TDatabase>(
  app: TApp,
  databaseId: string | undefined,
  selector: FirestoreSelector<TApp, TDatabase>,
): TDatabase {
  const normalized = databaseId?.trim();
  return normalized
    ? selector(app, normalized)
    : selector(app);
}

export function getConfiguredFirestore(
  config: FirebaseWebConfig,
): Firestore {
  const app = getOrInitializeFirebaseApp(config);
  return selectFirestoreDatabase<FirebaseApp, Firestore>(
    app,
    config.databaseId,
    getFirestore,
  );
}
