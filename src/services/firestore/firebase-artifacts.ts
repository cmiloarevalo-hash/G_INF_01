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
  CreateProjectArtifactInput,
  ProjectAnalysisDriver,
  ProjectAnalysisMetadata,
  ProjectArtifactMetadata,
  ProjectReportDriver,
  ProjectReportMetadata,
} from './artifacts.js';

interface ArtifactSnapshotLike {
  id: string;
  data(): Record<string, unknown> | undefined;
}

interface ArtifactGetSnapshotLike extends ArtifactSnapshotLike {
  exists(): boolean;
}

export interface ProjectArtifactFirestoreRuntime {
  serverTimestamp(): unknown;
  create(
    collectionPath: string,
    data: Record<string, unknown>,
  ): Promise<{ id: string }>;
  list(collectionPath: string): Promise<ArtifactSnapshotLike[]>;
  get(documentPath: string): Promise<ArtifactGetSnapshotLike>;
}

function timestampToDate(value: unknown): Date | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { toDate?: () => Date };
  return typeof candidate.toDate === 'function' ? candidate.toDate() : null;
}

function requiredText(
  data: Record<string, unknown>,
  key: 'driveFileId',
): string {
  const value = data[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Los metadatos persistidos del artefacto no son válidos.');
  }
  return value.trim();
}

function optionalText(
  data: Record<string, unknown>,
  key: 'name' | 'mimeType',
): string | undefined {
  const value = data[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Los metadatos persistidos del artefacto no son válidos.');
  }
  return value.trim();
}

export function artifactFromSnapshot(
  snapshot: ArtifactSnapshotLike,
): ProjectArtifactMetadata {
  const data = snapshot.data();
  if (!data) {
    throw new Error('Los metadatos persistidos del artefacto no son válidos.');
  }

  const name = optionalText(data, 'name');
  const mimeType = optionalText(data, 'mimeType');

  return {
    id: snapshot.id,
    driveFileId: requiredText(data, 'driveFileId'),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    ...(name ? { name } : {}),
    ...(mimeType ? { mimeType } : {}),
  };
}

function path(uid: string, projectId: string, collectionName: string): string {
  return `users/${uid}/projects/${projectId}/${collectionName}`;
}

function createDriver<T extends ProjectArtifactMetadata>(
  collectionName: 'analyses' | 'reports',
  runtime: ProjectArtifactFirestoreRuntime,
): {
  create(
    uid: string,
    projectId: string,
    input: CreateProjectArtifactInput,
  ): Promise<T>;
  list(uid: string, projectId: string): Promise<T[]>;
  get(uid: string, projectId: string, artifactId: string): Promise<T | null>;
} {
  return {
    async create(uid, projectId, input) {
      const timestamp = runtime.serverTimestamp();
      const created = await runtime.create(
        path(uid, projectId, collectionName),
        {
          driveFileId: input.driveFileId,
          createdAt: timestamp,
          updatedAt: timestamp,
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.mimeType !== undefined ? { mimeType: input.mimeType } : {}),
        },
      );

      return {
        id: created.id,
        ...input,
        createdAt: null,
        updatedAt: null,
      } as T;
    },

    async list(uid, projectId) {
      const snapshots = await runtime.list(path(uid, projectId, collectionName));
      return snapshots.map((snapshot) => artifactFromSnapshot(snapshot) as T);
    },

    async get(uid, projectId, artifactId) {
      const snapshot = await runtime.get(
        `${path(uid, projectId, collectionName)}/${artifactId}`,
      );
      return snapshot.exists()
        ? artifactFromSnapshot(snapshot) as T
        : null;
    },
  };
}

export function createProjectAnalysisDriverWithRuntime(
  runtime: ProjectArtifactFirestoreRuntime,
): ProjectAnalysisDriver {
  return createDriver<ProjectAnalysisMetadata>('analyses', runtime);
}

export function createProjectReportDriverWithRuntime(
  runtime: ProjectArtifactFirestoreRuntime,
): ProjectReportDriver {
  return createDriver<ProjectReportMetadata>('reports', runtime);
}

function createFirebaseRuntime(
  config: FirebaseWebConfig,
): ProjectArtifactFirestoreRuntime {
  const db = getFirestore(getOrInitializeFirebaseApp(config));

  return {
    serverTimestamp,

    async create(collectionPath, data) {
      const reference = doc(collection(db, collectionPath));
      await setDoc(reference, data);
      return { id: reference.id };
    },

    async list(collectionPath) {
      const snapshot = await getDocs(query(
        collection(db, collectionPath),
        orderBy('updatedAt', 'desc'),
      ));
      return snapshot.docs;
    },

    async get(documentPath) {
      return getDoc(doc(db, documentPath));
    },
  };
}

export function createFirestoreProjectAnalysisDriver(
  config: FirebaseWebConfig,
): ProjectAnalysisDriver {
  return createProjectAnalysisDriverWithRuntime(createFirebaseRuntime(config));
}

export function createFirestoreProjectReportDriver(
  config: FirebaseWebConfig,
): ProjectReportDriver {
  return createProjectReportDriverWithRuntime(createFirebaseRuntime(config));
}
