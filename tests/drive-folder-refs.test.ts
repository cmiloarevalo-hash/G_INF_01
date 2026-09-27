import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('persisted Drive folder reference contract excludes credentials and file bytes', () => {
  const typeSource = readFileSync(
    new URL('../src/services/firestore/types.ts', import.meta.url),
    'utf8',
  );
  const match = typeSource.match(
    /export interface ProjectDriveFolderRefs \{([\s\S]*?)\n\}/,
  );
  assert.ok(match);
  const contract = match[1] ?? '';
  assert.doesNotMatch(contract, /accessToken|refreshToken|apiKey|oauth|bytes|blob/i);
  for (const field of [
    'applicationRootFolderId',
    'projectsRootFolderId',
    'projectFolderId',
    'documentsFolderId',
    'analysisFolderId',
    'reportsFolderId',
  ]) {
    assert.match(contract, new RegExp(field));
  }
});

test('Firestore Drive-ref implementation keeps the existing users/projects path', () => {
  const source = readFileSync(
    new URL('../src/services/firestore/firebase.ts', import.meta.url),
    'utf8',
  );
  assert.match(source, /doc\(db, 'users', uid, 'projects', projectId\)/);
  assert.doesNotMatch(source, /accessToken|refreshToken|apiKey/);
});
