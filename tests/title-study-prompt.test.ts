import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const promptPath = 'src/report-types/title-study/prompt.md';

test('prompt is generalized, evidence-driven and rejects absence boilerplate', async () => {
  const prompt = await readFile(promptPath, 'utf8');

  assert.ok(prompt.includes('Concéntrate en **lo que los documentos sí contienen**'));
  assert.ok(prompt.includes('No generes campos, filas o secciones vacías'));
  assert.ok(prompt.includes('NO CONSTA EN ANTECEDENTES'));
  assert.doesNotMatch(prompt, /relevant_absence/i);
  assert.doesNotMatch(prompt, /missingInformation/);
});

test('prompt permits unclassified sources and derives downstream provenance', async () => {
  const prompt = await readFile(promptPath, 'utf8');

  assert.ok(prompt.includes('omite `documentType`'));
  assert.ok(prompt.includes('no inventes una clasificación'));
  assert.ok(prompt.includes('no repitas `sourceDocumentIds`'));
  assert.ok(prompt.includes('Las fuentes se derivan de esos hechos'));
});

test('prompt includes recognition cues for the accepted Chilean document families', async () => {
  const prompt = await readFile(promptPath, 'utf8');

  const cues = [
    'Escrituras públicas',
    'Inscripciones de dominio y dominio vigente',
    'Hipotecas, gravámenes y prohibiciones',
    'Sucesiones / posesión efectiva / herencia',
    'SII / antecedentes de bien raíz',
    'Avalúo fiscal simple/detallado',
    'Contribuciones / deuda / pagos',
    'CIP / MINVU / DOM',
    'Permisos, recepciones y regularizaciones DOM',
    'Subdivisión / loteo / fusión / copropiedad',
    'SAG / subdivisión rural',
    'Mutuos, hipotecas y alzamientos',
    'Personerías y poderes',
    'Otros documentos relacionados',
  ];

  for (const cue of cues) assert.ok(prompt.includes(cue), `missing family cue: ${cue}`);
});

test('prompt requires traceable facts and separates temporal difference from contradiction', async () => {
  const prompt = await readFile(promptPath, 'utf8');

  assert.ok(prompt.includes('sourceDocumentIds'));
  assert.ok(prompt.includes('evidenceLocators'));
  assert.ok(prompt.includes('TEMPORAL_CHANGE'));
  assert.ok(prompt.includes('POSSIBLE_CONTRADICTION'));
  assert.ok(prompt.includes('AUTHORITY_SCOPE_DIFFERENCE'));
  assert.ok(prompt.includes('Antes de declarar contradicción'));
});
