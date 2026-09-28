import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  createMemoryAiCredentialStore,
  SUPPORTED_AI_MODEL,
  SUPPORTED_AI_PROVIDER,
  type AiPreference,
} from '../src/services/ai/preferences.js';
import {
  analyzeGuestDocuments,
  type GeminiFetch,
} from '../src/services/ai/gemini.js';
import { createConfiguredAnalysisService } from '../src/services/ai/configured-analysis.js';
import {
  createAiPreferenceRepositoryWithRuntime,
  type AiPreferenceFirestoreRuntime,
} from '../src/services/firestore/firebase-ai-preferences.js';

function snapshot(data: Record<string, unknown> | undefined, exists = true) {
  return {
    exists: () => exists,
    data: () => data,
  };
}

test('AI preference repository persists only supported provider and model at user preference path', async () => {
  const writes: Array<{ path: string; data: Record<string, unknown> }> = [];
  const runtime: AiPreferenceFirestoreRuntime = {
    async get() {
      return snapshot(undefined, false);
    },
    async set(path, data) {
      writes.push({ path, data });
    },
  };
  const repository = createAiPreferenceRepositoryWithRuntime(runtime);
  const preference: AiPreference = {
    provider: SUPPORTED_AI_PROVIDER,
    model: SUPPORTED_AI_MODEL,
  };

  assert.deepEqual(await repository.set('uid-a', preference), preference);
  assert.deepEqual(writes, [{
    path: 'users/uid-a/preferences/ai',
    data: {
      provider: 'gemini',
      model: 'gemini-3.6-flash',
    },
  }]);
});

test('AI preference repository rejects unsupported persisted configuration', async () => {
  const repository = createAiPreferenceRepositoryWithRuntime({
    async get() {
      return snapshot({
        provider: 'other-provider',
        model: 'other-model',
      });
    },
    async set() {},
  });

  await assert.rejects(repository.get('uid-a'), /no está soportada/);
});

test('session AI credential store is memory-only and clearable', () => {
  const credentials = createMemoryAiCredentialStore();

  assert.equal(credentials.get(), null);
  credentials.set('  session-secret  ');
  assert.equal(credentials.get(), 'session-secret');
  credentials.clear();
  assert.equal(credentials.get(), null);
  assert.throws(() => credentials.set('   '), /no puede estar vacía/);
});

test('Gemini boundary applies supported model and additional instruction', async () => {
  let requestBody: Record<string, unknown> | null = null;
  const report = {
    reportType: 'TITLE_STUDY',
    sourceDocuments: [{
      id: 'doc-1',
      documentType: 'texto',
      name: 'doc.txt',
    }],
  };

  const fetchImpl: GeminiFetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return Response.json({
      status: 'completed',
      output_text: JSON.stringify(report),
    });
  };

  const result = await analyzeGuestDocuments(
    'session-key',
    [{
      id: 'doc-1',
      name: 'doc.txt',
      mimeType: 'text/plain',
      size: 5,
      data: 'VGV4dG8=',
    }],
    fetchImpl,
    {
      provider: SUPPORTED_AI_PROVIDER,
      model: SUPPORTED_AI_MODEL,
      additionalInstruction: '  Prioriza diferencias registrales.  ',
    },
  );

  assert.deepEqual(result.report, report);
  assert.equal(requestBody?.model, SUPPORTED_AI_MODEL);
  const input = requestBody?.input as Array<{ type?: string; text?: string }>;
  assert.equal(
    input.some((part) =>
      part.text === 'Instrucción adicional del usuario: Prioriza diferencias registrales.'
    ),
    true,
  );
});

test('Gemini boundary rejects unsupported provider/model before network', async () => {
  let calls = 0;
  const fetchImpl: GeminiFetch = async () => {
    calls += 1;
    return Response.json({});
  };

  await assert.rejects(
    analyzeGuestDocuments(
      'session-key',
      [{
        id: 'doc-1',
        name: 'doc.txt',
        mimeType: 'text/plain',
        size: 5,
        data: 'VGV4dG8=',
      }],
      fetchImpl,
      {
        provider: 'other' as typeof SUPPORTED_AI_PROVIDER,
        model: SUPPORTED_AI_MODEL,
      },
    ),
    /no está soportado/,
  );
  assert.equal(calls, 0);
});

test('AI capability source contains no browser or persistent credential storage', () => {
  const source = [
    'src/services/ai/preferences.ts',
    'src/services/firestore/firebase-ai-preferences.ts',
  ].map((path) => readFileSync(path, 'utf8')).join('\n');

  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/i);
  assert.doesNotMatch(source, /accessToken|refreshToken/i);
});


test('configured analysis service reads preference and session credential without persistence', async () => {
  const credentials = createMemoryAiCredentialStore();
  credentials.set('memory-only-key');
  let preferenceReads = 0;
  let observedKey: string | null = null;
  let observedModel: unknown = null;

  const service = createConfiguredAnalysisService(
    {
      async get() {
        preferenceReads += 1;
        return {
          provider: SUPPORTED_AI_PROVIDER,
          model: SUPPORTED_AI_MODEL,
        };
      },
      async set(_session, preference) {
        return preference;
      },
    },
    credentials,
  );

  const fetchImpl: GeminiFetch = async (_input, init) => {
    const headers = new Headers(init?.headers);
    observedKey = headers.get('x-goog-api-key');
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    observedModel = body.model;
    return Response.json({
      status: 'completed',
      output_text: JSON.stringify({
        reportType: 'TITLE_STUDY',
        sourceDocuments: [{
          id: 'doc-1',
          documentType: 'texto',
          name: 'doc.txt',
        }],
      }),
    });
  };

  await service.analyze(
    {
      status: 'authenticated',
      user: {
        uid: 'uid-a',
        displayName: null,
        email: null,
        photoURL: null,
      },
    },
    [{
      id: 'doc-1',
      name: 'doc.txt',
      mimeType: 'text/plain',
      size: 5,
      data: 'VGV4dG8=',
    }],
    'Instrucción',
    fetchImpl,
  );

  assert.equal(preferenceReads, 1);
  assert.equal(observedKey, 'memory-only-key');
  assert.equal(observedModel, SUPPORTED_AI_MODEL);
});
