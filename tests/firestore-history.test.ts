import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { AuthSessionState } from '../src/services/auth/types.js';
import {
  AuthenticatedHistorySessionError,
  createAuthenticatedProjectHistoryService,
} from '../src/services/firestore/history-authenticated.js';
import {
  ProjectHistoryInputError,
  createProjectHistoryRepository,
} from '../src/services/firestore/history-service.js';
import type {
  AnalysisMetadata,
  ProjectHistoryDriver,
  ReportMetadata,
} from '../src/services/firestore/history-types.js';

function authenticated(uid = 'session-uid'): AuthSessionState {
  return {
    status: 'authenticated',
    user: { uid, displayName: null, email: null, photoURL: null },
  };
}

function analysis(id: string, reportType = 'TITLE_STUDY'): AnalysisMetadata {
  return {
    id,
    reportType,
    createdAt: null,
    updatedAt: null,
    driveJsonFileId: 'json-drive-id',
  };
}

function report(id: string, analysisId = 'analysis-1'): ReportMetadata {
  return {
    id,
    analysisId,
    reportType: 'TITLE_STUDY',
    createdAt: null,
    updatedAt: null,
    driveDocxFileId: 'docx-drive-id',
  };
}

function fakeDriver() {
  const calls: Array<{ op: string; uid: string; projectId: string; id?: string }> = [];
  const analyses = new Map<string, AnalysisMetadata>([['analysis-1', analysis('analysis-1')]]);
  const reports = new Map<string, ReportMetadata>([['report-1', report('report-1')]]);

  const driver: ProjectHistoryDriver = {
    async createAnalysis(uid, projectId, input) {
      calls.push({ op: 'createAnalysis', uid, projectId });
      const value = {
        id: 'analysis-created',
        reportType: input.reportType,
        createdAt: null,
        updatedAt: null,
        ...(input.driveJsonFileId ? { driveJsonFileId: input.driveJsonFileId } : {}),
      };
      analyses.set(value.id, value);
      return value;
    },
    async listAnalyses(uid, projectId) {
      calls.push({ op: 'listAnalyses', uid, projectId });
      return [...analyses.values()];
    },
    async getAnalysis(uid, projectId, id) {
      calls.push({ op: 'getAnalysis', uid, projectId, id });
      return analyses.get(id) ?? null;
    },
    async createReport(uid, projectId, input) {
      calls.push({ op: 'createReport', uid, projectId });
      const value = {
        id: 'report-created',
        analysisId: input.analysisId,
        reportType: input.reportType,
        createdAt: null,
        updatedAt: null,
        ...(input.driveDocxFileId ? { driveDocxFileId: input.driveDocxFileId } : {}),
      };
      reports.set(value.id, value);
      return value;
    },
    async listReports(uid, projectId) {
      calls.push({ op: 'listReports', uid, projectId });
      return [...reports.values()];
    },
    async getReport(uid, projectId, id) {
      calls.push({ op: 'getReport', uid, projectId, id });
      return reports.get(id) ?? null;
    },
  };

  return { driver, calls };
}

test('history repository create/list/get analysis and report metadata', async () => {
  const fake = fakeDriver();
  const repository = createProjectHistoryRepository(fake.driver);

  const createdAnalysis = await repository.createAnalysis(' uid-a ', ' project-a ', {
    reportType: ' TITLE_STUDY ',
    driveJsonFileId: ' json-id ',
  });
  assert.equal(createdAnalysis.reportType, 'TITLE_STUDY');
  assert.equal(createdAnalysis.driveJsonFileId, 'json-id');
  assert.equal((await repository.listAnalyses('uid-a', 'project-a')).length >= 1, true);
  assert.equal((await repository.getAnalysis('uid-a', 'project-a', 'missing')), null);

  const createdReport = await repository.createReport('uid-a', 'project-a', {
    analysisId: ' analysis-1 ',
    reportType: ' TITLE_STUDY ',
    driveDocxFileId: ' docx-id ',
  });
  assert.equal(createdReport.analysisId, 'analysis-1');
  assert.equal(createdReport.driveDocxFileId, 'docx-id');
  assert.equal((await repository.listReports('uid-a', 'project-a')).length >= 1, true);
  assert.equal((await repository.getReport('uid-a', 'project-a', 'missing')), null);
});

test('invalid history metadata is rejected before driver access', async () => {
  const fake = fakeDriver();
  const repository = createProjectHistoryRepository(fake.driver);

  await assert.rejects(
    repository.createAnalysis('uid-a', 'project-a', { reportType: '   ' }),
    (error) => error instanceof ProjectHistoryInputError,
  );
  await assert.rejects(
    repository.createReport('uid-a', 'project-a', {
      analysisId: '   ',
      reportType: 'TITLE_STUDY',
    }),
    (error) => error instanceof ProjectHistoryInputError,
  );
  assert.equal(fake.calls.length, 0);
});

test('authenticated history layer derives UID from session only', async () => {
  const fake = fakeDriver();
  const service = createAuthenticatedProjectHistoryService(
    createProjectHistoryRepository(fake.driver),
  );
  const session = authenticated('uid-from-session');

  await service.listAnalyses(session, 'project-a');
  await service.getAnalysis(session, 'project-a', 'analysis-1');
  await service.listReports(session, 'project-a');
  await service.getReport(session, 'project-a', 'report-1');

  assert.equal(fake.calls.every((call) => call.uid === 'uid-from-session'), true);
  assert.equal(fake.calls.every((call) => call.projectId === 'project-a'), true);
});

test('checking and unauthenticated history access fail before repository calls', async () => {
  const fake = fakeDriver();
  const service = createAuthenticatedProjectHistoryService(
    createProjectHistoryRepository(fake.driver),
  );

  await assert.rejects(
    service.listAnalyses({ status: 'checking' }, 'project-a'),
    (error) => error instanceof AuthenticatedHistorySessionError,
  );
  await assert.rejects(
    service.listReports({ status: 'unauthenticated' }, 'project-a'),
    (error) => error instanceof AuthenticatedHistorySessionError,
  );
  assert.equal(fake.calls.length, 0);
});

test('history repository failure remains failure while not-found remains null', async () => {
  const failing: ProjectHistoryDriver = {
    async createAnalysis() { throw new Error('history unavailable'); },
    async listAnalyses() { throw new Error('history unavailable'); },
    async getAnalysis() { throw new Error('history unavailable'); },
    async createReport() { throw new Error('history unavailable'); },
    async listReports() { throw new Error('history unavailable'); },
    async getReport() { throw new Error('history unavailable'); },
  };
  const repository = createProjectHistoryRepository(failing);
  await assert.rejects(repository.getAnalysis('uid', 'project', 'analysis'), /history unavailable/);
  await assert.rejects(repository.getReport('uid', 'project', 'report'), /history unavailable/);
});

test('history contracts and Firestore driver exclude document bytes and credentials', () => {
  const source = [
    '../src/services/firestore/history-types.ts',
    '../src/services/firestore/history-firebase.ts',
    '../src/services/firestore/history-authenticated.ts',
  ]
    .map((file) => readFileSync(new URL(file, import.meta.url), 'utf8'))
    .join('\n');

  assert.doesNotMatch(source, /accessToken|refreshToken|apiKey|oauthState/i);
  assert.doesNotMatch(source, /pdfBytes|docxBytes|documentBytes|Blob|Uint8Array/);
  assert.doesNotMatch(source, /ownerUid|uidOverride/);
});
