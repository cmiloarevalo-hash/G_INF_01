import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuthSessionState } from '../src/services/auth/types.js';
import {
  createPersistedProjectAnalysisService,
  PersistedProjectAnalysisError,
} from '../src/services/application/project-analysis.js';
import type { AuthenticatedProjectDocumentService } from '../src/services/firestore/authenticated-documents.js';
import type { DriveReferenceReader } from '../src/services/drive/reference.js';
import type { ConfiguredAnalysisService } from '../src/services/ai/configured-analysis.js';
import type { AnalysisPersistenceService } from '../src/services/application/authenticated-capabilities.js';

const session: AuthSessionState = {
  status: 'authenticated',
  user: { uid: 'uid-a', displayName: null, email: null, photoURL: null },
};

const report = {
  reportType: 'TITLE_STUDY' as const,
  sourceDocuments: [{ id: 'doc-1', name: 'doc.txt', documentType: 'texto' }],
};

function documents(): AuthenticatedProjectDocumentService {
  return {
    async create() { throw new Error('not used'); },
    async list() {
      return [{
        id: 'doc-1',
        driveFileId: 'drive-1',
        name: 'doc.txt',
        mimeType: 'text/plain',
        source: 'local-upload',
        createdAt: null,
        updatedAt: null,
      }];
    },
    async get() { return null; },
  };
}

function reader(
  status: Awaited<ReturnType<DriveReferenceReader['read']>> = {
    status: 'available',
    file: {
      id: 'drive-1',
      name: 'doc.txt',
      mimeType: 'text/plain',
      content: new TextEncoder().encode('texto').buffer,
    },
  },
): DriveReferenceReader {
  return { async read() { return status; } };
}

function analysis(): ConfiguredAnalysisService {
  return {
    async analyze(_session, files) {
      assert.equal(files.length, 1);
      assert.equal(files[0]?.id, 'doc-1');
      return {
        report,
        statuses: [{
          id: 'doc-1',
          name: 'doc.txt',
          status: 'Fuente identificada',
          submissionAttempted: true,
          sourceIdentified: true,
          contentVerified: false,
        }],
        partial: false,
      };
    },
  };
}

function persistence(): AnalysisPersistenceService {
  return {
    async persist(_session, _projectId, value) {
      assert.equal((value as typeof report).reportType, 'TITLE_STUDY');
      return {
        id: 'analysis-1',
        driveFileId: 'drive-analysis-1',
        name: 'analisis.json',
        mimeType: 'application/json',
        createdAt: null,
        updatedAt: null,
      };
    },
  };
}

test('M4.4a analyzes persisted Drive content then persists only validated result', async () => {
  const service = createPersistedProjectAnalysisService(
    documents(),
    reader(),
    analysis(),
    persistence(),
  );
  const result = await service.analyze(session, 'project-a', 'Instrucción');
  assert.equal(result.report.reportType, 'TITLE_STUDY');
  assert.equal(result.metadata.id, 'analysis-1');
});

test('M4.4a stale/unavailable/auth-required Drive refs fail before provider', async () => {
  for (const [status, kind] of [
    [{ status: 'not-found' } as const, 'stale'],
    [{ status: 'unavailable' } as const, 'unavailable'],
    [{ status: 'authorization-required' } as const, 'authorization-required'],
  ] as const) {
    let providerCalls = 0;
    const service = createPersistedProjectAnalysisService(
      documents(),
      reader(status),
      {
        async analyze() {
          providerCalls += 1;
          throw new Error('unexpected');
        },
      },
      persistence(),
    );
    await assert.rejects(
      service.analyze(session, 'project-a'),
      (error) =>
        error instanceof PersistedProjectAnalysisError &&
        error.kind === kind,
    );
    assert.equal(providerCalls, 0);
  }
});

test('M4.4a provider/validation failure never persists a fake result', async () => {
  let persistenceCalls = 0;
  const service = createPersistedProjectAnalysisService(
    documents(),
    reader(),
    {
      async analyze() {
        return {
          statuses: [],
          partial: false,
          error: 'Gemini devolvió JSON inválido o truncado.',
        };
      },
    },
    {
      async persist() {
        persistenceCalls += 1;
        throw new Error('unexpected');
      },
    },
  );

  await assert.rejects(
    service.analyze(session, 'project-a'),
    (error) =>
      error instanceof PersistedProjectAnalysisError &&
      error.kind === 'validation',
  );
  assert.equal(persistenceCalls, 0);
});

test('M4.4a persistence failure preserves validated report as partial-failure evidence', async () => {
  const service = createPersistedProjectAnalysisService(
    documents(),
    reader(),
    analysis(),
    {
      async persist() {
        throw new Error('firestore failed');
      },
    },
  );
  await assert.rejects(
    service.analyze(session, 'project-a'),
    (error) =>
      error instanceof PersistedProjectAnalysisError &&
      error.kind === 'persistence' &&
      error.validatedReport?.reportType === 'TITLE_STUDY',
  );
});

test('M4.4a duplicate analysis attempts are rejected while first is pending', async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const service = createPersistedProjectAnalysisService(
    documents(),
    reader(),
    {
      async analyze() {
        await gate;
        return { report, statuses: [], partial: false };
      },
    },
    persistence(),
  );

  const first = service.analyze(session, 'project-a');
  await assert.rejects(
    service.analyze(session, 'project-a'),
    (error) =>
      error instanceof PersistedProjectAnalysisError &&
      error.kind === 'duplicate',
  );
  release();
  await first;
});
