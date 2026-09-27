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
import type {
  AnalysisMetadata,
  CreateAnalysisMetadataInput,
  CreateReportMetadataInput,
  ProjectHistoryDriver,
  ReportMetadata,
} from './history-types.js';

interface SnapshotLike {
  id: string;
  data(): DocumentData | undefined;
}

function timestampToDate(value: unknown): Date | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { toDate?: () => Date };
  return typeof candidate.toDate === 'function' ? candidate.toDate() : null;
}

function requiredString(data: DocumentData, key: string, label: string): string {
  const value = data[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Los metadatos persistidos de ${label} no son válidos.`);
  }
  return value.trim();
}

function optionalString(data: DocumentData, key: string): string | undefined {
  const value = data[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('La referencia Drive persistida no es válida.');
  }
  return value.trim();
}

function analysisFromSnapshot(snapshot: SnapshotLike): AnalysisMetadata {
  const data = snapshot.data();
  if (!data) throw new Error('Los metadatos persistidos de análisis no son válidos.');
  const driveJsonFileId = optionalString(data, 'driveJsonFileId');
  return {
    id: snapshot.id,
    reportType: requiredString(data, 'reportType', 'análisis'),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    ...(driveJsonFileId ? { driveJsonFileId } : {}),
  };
}

function reportFromSnapshot(snapshot: SnapshotLike): ReportMetadata {
  const data = snapshot.data();
  if (!data) throw new Error('Los metadatos persistidos de informe no son válidos.');
  const driveDocxFileId = optionalString(data, 'driveDocxFileId');
  return {
    id: snapshot.id,
    analysisId: requiredString(data, 'analysisId', 'informe'),
    reportType: requiredString(data, 'reportType', 'informe'),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    ...(driveDocxFileId ? { driveDocxFileId } : {}),
  };
}

function createPayload(
  input: CreateAnalysisMetadataInput | CreateReportMetadataInput,
): Record<string, unknown> {
  return {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function createFirestoreProjectHistoryDriver(
  config: FirebaseWebConfig,
): ProjectHistoryDriver {
  const db = getFirestore(getOrInitializeFirebaseApp(config));

  return {
    async createAnalysis(uid, projectId, input) {
      const reference = doc(
        collection(db, 'users', uid, 'projects', projectId, 'analyses'),
      );
      await setDoc(reference, createPayload(input));
      return {
        id: reference.id,
        reportType: input.reportType,
        createdAt: null,
        updatedAt: null,
        ...(input.driveJsonFileId ? { driveJsonFileId: input.driveJsonFileId } : {}),
      };
    },

    async listAnalyses(uid, projectId) {
      const snapshot = await getDocs(
        query(
          collection(db, 'users', uid, 'projects', projectId, 'analyses'),
          orderBy('updatedAt', 'desc'),
        ),
      );
      return snapshot.docs.map(analysisFromSnapshot);
    },

    async getAnalysis(uid, projectId, analysisId) {
      const snapshot = await getDoc(
        doc(db, 'users', uid, 'projects', projectId, 'analyses', analysisId),
      );
      return snapshot.exists() ? analysisFromSnapshot(snapshot) : null;
    },

    async createReport(uid, projectId, input) {
      const reference = doc(
        collection(db, 'users', uid, 'projects', projectId, 'reports'),
      );
      await setDoc(reference, createPayload(input));
      return {
        id: reference.id,
        analysisId: input.analysisId,
        reportType: input.reportType,
        createdAt: null,
        updatedAt: null,
        ...(input.driveDocxFileId ? { driveDocxFileId: input.driveDocxFileId } : {}),
      };
    },

    async listReports(uid, projectId) {
      const snapshot = await getDocs(
        query(
          collection(db, 'users', uid, 'projects', projectId, 'reports'),
          orderBy('updatedAt', 'desc'),
        ),
      );
      return snapshot.docs.map(reportFromSnapshot);
    },

    async getReport(uid, projectId, reportId) {
      const snapshot = await getDoc(
        doc(db, 'users', uid, 'projects', projectId, 'reports', reportId),
      );
      return snapshot.exists() ? reportFromSnapshot(snapshot) : null;
    },
  };
}
