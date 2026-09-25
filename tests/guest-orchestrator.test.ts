import test from 'node:test';
import assert from 'node:assert/strict';
import { orchestrateGuestAnalysis } from '../src/services/ai/guest-orchestrator.js';

interface MockFile { name: string; size: number }
interface MockExtraction { documentId: string; facts: string }

test('processes supported documents around an unsupported one and returns a marked partial discrepancy result', async () => {
  const files: MockFile[] = [
    { name: 'escritura.txt', size: 20 },
    { name: 'planilla.xlsx', size: 1024 },
    { name: 'certificado.txt', size: 25 },
  ];
  const statuses: Array<{ name: string; status: string; reason?: string }> = [];
  const extracted: string[] = [];
  const result = await orchestrateGuestAnalysis<MockFile, MockExtraction, { discrepancy: string }>(files, {
    getName: (file) => file.name,
    getSize: (file) => file.size,
    onStatus: (file, status, reason) => statuses.push({ name: file.name, status, reason }),
    stopOnError: () => false,
    extract: async (file, index) => { extracted.push(file.name); return { documentId: `doc-${index}`, facts: file.name }; },
    synthesize: async (items) => {
      assert.deepEqual(items.map((item) => item.facts), ['escritura.txt', 'certificado.txt']);
      return { discrepancy: 'Conservar ambos valores distintos.' };
    },
  });
  assert.deepEqual(extracted, ['escritura.txt', 'certificado.txt']);
  assert.equal(statuses.find((item) => item.name === 'planilla.xlsx')?.status, 'No analizado');
  assert.match(statuses.find((item) => item.name === 'planilla.xlsx')?.reason ?? '', /Formato aún no procesado/);
  assert.equal(result.partial, true);
  assert.equal(result.report.discrepancy, 'Conservar ambos valores distintos.');
});

test('does not report a completed analysis when every selected file is unsupported', async () => {
  await assert.rejects(orchestrateGuestAnalysis([{ name: 'libro.xlsx', size: 100 }], {
    getName: (file) => file.name,
    getSize: (file) => file.size,
    onStatus: () => {},
    stopOnError: () => false,
    extract: async () => { throw new Error('must not run'); },
    synthesize: async () => 'must not run',
  }), /Ningún archivo compatible produjo un extracto verificable/);
});

test('marks files not sent after a global provider failure and never synthesizes a report', async () => {
  const files = [{ name: 'a.txt', size: 1 }, { name: 'b.txt', size: 1 }];
  const statuses: Array<{ name: string; status: string; reason?: string }> = [];
  let extractions = 0;
  await assert.rejects(orchestrateGuestAnalysis(files, {
    getName: (file) => file.name,
    getSize: (file) => file.size,
    onStatus: (file, status, reason) => statuses.push({ name: file.name, status, reason }),
    stopOnError: () => true,
    extract: async () => { extractions += 1; throw new Error('Gemini rejected key'); },
    synthesize: async () => 'must not run',
  }), /Ningún archivo compatible produjo un extracto verificable/);
  assert.equal(extractions, 1);
  assert.equal(statuses.find((item) => item.name === 'b.txt')?.status, 'No analizado');
  assert.match(statuses.find((item) => item.name === 'b.txt')?.reason ?? '', /no se envió/);
});
