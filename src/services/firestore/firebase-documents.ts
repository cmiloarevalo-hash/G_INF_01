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
} from 'firebase/firestore';
import type { FirebaseWebConfig } from '../auth/config.js';
import { getOrInitializeFirebaseApp } from '../firebase/app.js';
import type {
  CreateProjectDocumentInput,
  ProjectDocumentDriver,
  ProjectDocumentMetadata,
  ProjectDocumentSource,
} from './document-types.js';

interface ProjectDocumentSnapshotLike {
  id: string;
  data(): Record<string, unknown> | undefined;
}

interface ProjectDocumentGetSnapshotLike extends ProjectDocumentSnapshotLike {
  exists(): boolean;
}

export interface ProjectDocumentFirestoreRuntime {
  serverTimestamp(): unknown;
  create(
    collectionPath: string,
    data: Record<string, unknown>,
  ): Promise<{ id: string }>;
  list(collectionPath: string): Promise<ProjectDocumentSnapshotLike[]>;
  get(documentPath: string): Promise<ProjectDocumentGetSnapshotLike>;
}

function projectDocumentsPath(uid: string, projectId: string): string {
  return `users/${uid}/projects/${projectId}/documents`;
}

function projectDocumentPath(
  uid: string,
  projectId: string,
  documentIdValue: string,
): string {
  return `${projectDocumentsPath(uid, projectId)}/${documentIdValue}`;
}

function timestampToDate(value: unknown): Date | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { toDate?: () => Date };
  return typeof candidate.toDate === 'function' ? candidate.toDate() : null;
}

function requiredStoredText(
  data: Record<string, unknown>,
  key: 'driveFileId',
): string {
  const value = data[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Los metadatos documentales persistidos no son válidos.');
  }
  return value.trim();
}

function optionalStoredText(
  data: Record<string, unknown>,
  key: 'name' | 'mimeType',
): string | undefined {
  const value = data[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Los metadatos documentales persistidos no son válidos.');
  }
  return value.trim();
}

function storedSource(value: unknown): ProjectDocumentSource {
  if (value !== 'local-upload' && value !== 'drive-picker') {
    throw new Error('Los metadatos documentales persistidos no son válidos.');
  }
  return value;
}

export function projectDocumentFromSnapshot(
  snapshot: ProjectDocumentSnapshotLike,
): ProjectDocumentMetadata {
  const data = snapshot.data();
  if (!data) {
    throw new Error('Los metadatos documentales persistidos no son válidos.');
  }

  const name = optionalStoredText(data, 'name');
  const mimeType = optionalStoredText(data, 'mimeType');

  return {
    id: snapshot.id,
    driveFileId: requiredStoredText(data, 'driveFileId'),
    source: storedSource(data.source),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    ...(name ? { name } : {}),
    ...(mimeType ? { mimeType } : {}),
  };
}

function persistedDocumentData(
  input: CreateProjectDocumentInput,
  timestamp: unknown,
): Record<string, unknown> {
  return {
    driveFileId: input.driveFileId,
    source: input.source,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.mimeType !== undefined ? { mimeType: input.mimeType } : {}),
  };
}

export function createProjectDocumentDriverWithRuntime(
  runtime: ProjectDocumentFirestoreRuntime,
): ProjectDocumentDriver {
  return {
    async create(uid, projectId, input) {
      const timestamp = runtime.serverTimestamp();
      const created = await runtime.create(
        projectDocumentsPath(uid, projectId),
        persistedDocumentData(input, timestamp),
      );

      return {
        id: created.id,
        driveFileId: input.driveFileId,
        source: input.source,
        createdAt: null,
        updatedAt: null,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.mimeType !== undefined ? { mimeType: input.mimeType } : {}),
      };
    },

    async list(uid, projectId) {
      const snapshots = await runtime.list(projectDocumentsPath(uid, projectId));
      return snapshots.map(projectDocumentFromSnapshot);
    },

    async get(uid, projectId, documentIdValue) {
      const snapshot = await runtime.get(
        projectDocumentPath(uid, projectId, documentIdValue),
      );
      return snapshot.exists() ? projectDocumentFromSnapshot(snapshot) : null;
    },
  };
}

export function createFirestoreProjectDocumentDriver(
  config: FirebaseWebConfig,
): ProjectDocumentDriver {
  const db = getFirestore(getOrInitializeFirebaseApp(config));

  return createProjectDocumentDriverWithRuntime({
    serverTimestamp,

    async create(collectionPath, data) {
      const reference = doc(collection(db, collectionPath));
      await setDoc(reference, data);
      return { id: reference.id };
    },

    async list(collectionPath) {
      const documents = query(
        collection(db, collectionPath),
        orderBy('updatedAt', 'desc'),
      );
      const snapshot = await getDocs(documents);
      return snapshot.docs;
    },

    async get(documentPath) {
      return getDoc(doc(db, documentPath));
    },
  });
}
