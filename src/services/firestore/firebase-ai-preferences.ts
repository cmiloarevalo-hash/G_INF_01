import {
  doc,
  getDoc,
  getFirestore,
  setDoc,
} from 'firebase/firestore';
import type { FirebaseWebConfig } from '../auth/config.js';
import {
  requireSupportedAiPreference,
  type AiPreference,
  type AiPreferenceRepository,
} from '../ai/preferences.js';
import { getOrInitializeFirebaseApp } from '../firebase/app.js';

interface PreferenceSnapshotLike {
  exists(): boolean;
  data(): Record<string, unknown> | undefined;
}

export interface AiPreferenceFirestoreRuntime {
  get(path: string): Promise<PreferenceSnapshotLike>;
  set(path: string, data: Record<string, unknown>): Promise<void>;
}

const preferencePath = (uid: string) => `users/${uid}/preferences/ai`;

export function aiPreferenceFromSnapshot(
  snapshot: PreferenceSnapshotLike,
): AiPreference | null {
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (!data) {
    throw new Error('La preferencia AI persistida no es válida.');
  }

  return requireSupportedAiPreference({
    provider: data.provider as AiPreference['provider'],
    model: data.model as AiPreference['model'],
  });
}

export function createAiPreferenceRepositoryWithRuntime(
  runtime: AiPreferenceFirestoreRuntime,
): AiPreferenceRepository {
  return {
    async get(uid) {
      return aiPreferenceFromSnapshot(await runtime.get(preferencePath(uid)));
    },

    async set(uid, preference) {
      const confirmed = requireSupportedAiPreference(preference);
      await runtime.set(preferencePath(uid), confirmed);
      return confirmed;
    },
  };
}

export function createFirestoreAiPreferenceRepository(
  config: FirebaseWebConfig,
): AiPreferenceRepository {
  const db = getFirestore(getOrInitializeFirebaseApp(config));

  return createAiPreferenceRepositoryWithRuntime({
    async get(path) {
      return getDoc(doc(db, path));
    },

    async set(path, data) {
      await setDoc(doc(db, path), data);
    },
  });
}
