import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fileIdentity,
  isPdfFile,
  removeSelectedFile,
  serializeSelectionUpdate,
  validateAndMergeFiles,
} from '../src/pages/GuestDocumentsPage.js';

function makeFile(name: string, contents: string, lastModified = 1): File {
  return new File([contents], name, { type: name.endsWith('.pdf') ? 'application/pdf' : 'text/plain', lastModified });
}

test('accepts a PDF signature within the bounded header and rejects other files', async () => {
  assert.equal(await isPdfFile(makeFile('escritura.pdf', '%PDF-1.7\ncontenido')), true);
  assert.equal(await isPdfFile(makeFile('plano.PDF', `${' '.repeat(100)}%PDF-1.4`)), true);
  assert.equal(await isPdfFile(makeFile('notas.txt', '%PDF-1.7')), false);
  assert.equal(await isPdfFile(makeFile('falso.pdf', 'texto sin cabecera PDF')), false);
});

test('merges multiple valid PDFs and reports invalid files and repeated selections', async () => {
  const first = makeFile('titulo.pdf', '%PDF-1.7 titulo');
  const second = makeFile('plano.pdf', '%PDF-1.7 plano');
  const sameSelection = makeFile('titulo.pdf', '%PDF-1.7 titulo');
  const invalid = makeFile('notas.txt', 'texto');

  const result = await validateAndMergeFiles([], [first, second, sameSelection, invalid]);

  assert.deepEqual(result.files, [first, second]);
  assert.deepEqual(result.duplicates, ['titulo.pdf']);
  assert.deepEqual(result.rejected, ['notas.txt']);
});

test('removing an existing selection permits adding it again', async () => {
  const file = makeFile('titulo.pdf', '%PDF-1.7');
  const result = await validateAndMergeFiles([], [file]);
  assert.deepEqual((await validateAndMergeFiles(result.files, [file])).duplicates, ['titulo.pdf']);
  const remaining = removeSelectedFile(result.files, fileIdentity(file));
  assert.deepEqual(remaining, []);
  assert.deepEqual((await validateAndMergeFiles(remaining, [file])).files, [file]);
});

test('a removal queued during async validation is applied after selection without restoring the removed file', async () => {
  const existing = makeFile('existente.pdf', '%PDF-1.7 existente');
  const incoming = makeFile('nuevo.pdf', '%PDF-1.7 nuevo');
  let selected = [existing];
  let releaseValidation!: () => void;
  const validationGate = new Promise<void>((resolve) => {
    releaseValidation = resolve;
  });
  const failures: unknown[] = [];
  const reportError = (error: unknown) => failures.push(error);
  let pending = Promise.resolve();

  pending = serializeSelectionUpdate(pending, async () => {
    const current = selected;
    await validationGate;
    const result = await validateAndMergeFiles(current, [incoming]);
    selected = result.files;
  }, reportError);
  pending = serializeSelectionUpdate(pending, async () => {
    selected = removeSelectedFile(selected, fileIdentity(existing));
  }, reportError);

  releaseValidation();
  await pending;

  assert.deepEqual(failures, []);
  assert.deepEqual(selected, [incoming]);
});
