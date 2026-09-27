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
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';
import type { FirebaseWebConfig } from '../auth/config.js';
import { getOrInitializeFirebaseApp } from '../firebase/app.js';
import type {
  ProjectDriveFolderRefs,
  ProjectDriver,
  ProjectMetadata,
} from './types.js';

interface ProjectSnapshotLike {
  id: string;
  data(): DocumentData | undefined;
}

function timestampToDate(value: unknown): Date | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { toDate?: () => Date };
  return typeof candidate.toDate === 'function' ? candidate.toDate() : null;
}

function driveFoldersFrom(value: unknown): ProjectDriveFolderRefs | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object') {
    throw new Error('Las referencias Drive persistidas del proyecto no son válidas.');
  }
  const record = value as Record<string, unknown>;
  const keys = [
    'applicationRootFolderId',
    'projectsRootFolderId',
    'projectFolderId',
    'documentsFolderId',
    'analysisFolderId',
    'reportsFolderId',
  ] as const;
  const normalized: Record<string, string> = {};
  for (const key of keys) {
    const item = record[key];
    if (typeof item !== 'string' || !item.trim()) {
      throw new Error('Las referencias Drive persistidas del proyecto no son válidas.');
    }
    normalized[key] = item.trim();
  }
  return normalized as unknown as ProjectDriveFolderRefs;
}

function projectFromSnapshot(snapshot: ProjectSnapshotLike): ProjectMetadata {
  const data = snapshot.data();
  if (!data || typeof data.name !== 'string' || !data.name.trim()) {
    throw new Error('Los metadatos persistidos del proyecto no son válidos.');
  }

  const driveFolders = driveFoldersFrom(data.driveFolders);
  return {
    id: snapshot.id,
    name: data.name.trim(),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    ...(driveFolders ? { driveFolders } : {}),
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

    async updateDriveFolders(uid, projectId, driveFolders) {
      const projectRef = doc(db, 'users', uid, 'projects', projectId);
      const existing = await getDoc(projectRef);
      if (!existing.exists()) return null;

      await updateDoc(projectRef, {
        driveFolders,
        updatedAt: serverTimestamp(),
      });

      const updated = await getDoc(projectRef);
      return updated.exists() ? projectFromSnapshot(updated) : null;
    },
  };
}
