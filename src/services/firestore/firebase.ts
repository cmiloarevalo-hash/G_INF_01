import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';
import type { FirebaseWebConfig } from '../auth/config.js';
import type { ProjectDriveFolders } from '../drive/types.js';
import { getConfiguredFirestore } from './database.js';
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

function storedFolderId(
  record: Record<string, unknown>,
  key: keyof ProjectDriveFolders,
): string {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Las referencias Drive persistidas del proyecto no son válidas.');
  }
  return value.trim();
}

function driveFoldersFromData(value: unknown): ProjectDriveFolders {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Las referencias Drive persistidas del proyecto no son válidas.');
  }

  const record = value as Record<string, unknown>;
  return {
    applicationRootId: storedFolderId(record, 'applicationRootId'),
    projectsRootId: storedFolderId(record, 'projectsRootId'),
    projectFolderId: storedFolderId(record, 'projectFolderId'),
    documentsFolderId: storedFolderId(record, 'documentsFolderId'),
    analysisFolderId: storedFolderId(record, 'analysisFolderId'),
    reportsFolderId: storedFolderId(record, 'reportsFolderId'),
  };
}

export function projectFromSnapshot(snapshot: ProjectSnapshotLike): ProjectMetadata {
  const data = snapshot.data();
  if (!data || typeof data.name !== 'string' || !data.name.trim()) {
    throw new Error('Los metadatos persistidos del proyecto no son válidos.');
  }

  const driveFolders = data.driveFolders === undefined
    ? undefined
    : driveFoldersFromData(data.driveFolders);

  return {
    id: snapshot.id,
    name: data.name.trim(),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    ...(driveFolders ? { driveFolders } : {}),
  };
}

export function createFirestoreProjectDriver(config: FirebaseWebConfig): ProjectDriver {
  const db = getConfiguredFirestore(config);

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
      const current = await getDoc(projectRef);
      if (!current.exists()) return null;

      await updateDoc(projectRef, {
        driveFolders,
        updatedAt: serverTimestamp(),
      });

      const updated = await getDoc(projectRef);
      return updated.exists() ? projectFromSnapshot(updated) : null;
    },
  };
}
