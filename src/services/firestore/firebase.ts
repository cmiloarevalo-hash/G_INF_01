import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from 'firebase/firestore';
import type { FirebaseWebConfig } from '../auth/config.js';
import { getOrInitializeFirebaseApp } from '../firebase/app.js';
import type { ProjectDriver, ProjectMetadata } from './types.js';

interface ProjectSnapshotLike {
  id: string;
  data(): DocumentData | undefined;
}

function timestampToDate(value: unknown): Date | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { toDate?: () => Date };
  return typeof candidate.toDate === 'function' ? candidate.toDate() : null;
}

function projectFromSnapshot(snapshot: ProjectSnapshotLike): ProjectMetadata {
  const data = snapshot.data();
  if (!data || typeof data.name !== 'string' || !data.name.trim()) {
    throw new Error('Los metadatos persistidos del proyecto no son válidos.');
  }

  return {
    id: snapshot.id,
    name: data.name.trim(),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
}

export function createFirestoreProjectDriver(config: FirebaseWebConfig): ProjectDriver {
  const db = getFirestore(getOrInitializeFirebaseApp(config));

  return {
    async create(uid, name) {
      const projectRef = doc(collection(db, 'users', uid, 'projects'));
      await setDoc(projectRef, {
        name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        id: projectRef.id,
        name,
        createdAt: null,
        updatedAt: null,
      };
    },

    async list(uid) {
      const projects = query(
        collection(db, 'users', uid, 'projects'),
        orderBy('updatedAt', 'desc'),
      );
      const snapshot = await getDocs(projects);
      return snapshot.docs.map(projectFromSnapshot);
    },

    async get(uid, projectId) {
      const snapshot = await getDoc(doc(db, 'users', uid, 'projects', projectId));
      return snapshot.exists() ? projectFromSnapshot(snapshot) : null;
    },
  };
}
