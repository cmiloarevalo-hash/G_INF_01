import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test, { after, before, beforeEach } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';

const PROJECT_ID = 'demo-g-inf-01';
const USER_A = 'user-a';
const USER_B = 'user-b';
const PROJECT_A = 'project-a';

let testEnv: RulesTestEnvironment;

function projectDocument(db: ReturnType<RulesTestEnvironment['authenticatedContext']>['firestore'], userId: string, projectId: string) {
  return doc(db, 'users', userId, 'projects', projectId);
}

async function seedOwnProject(userId = USER_A, projectId = PROJECT_A) {
  const db = testEnv.authenticatedContext(userId).firestore();
  await assertSucceeds(
    setDoc(projectDocument(db, userId, projectId), {
      name: 'Proyecto A',
      createdAt: 'seed',
      updatedAt: 'seed',
    }),
  );
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

test('rules tests use demo project isolation only', () => {
  assert.match(PROJECT_ID, /^demo-/);
});

test('unauthenticated project create is denied', async () => {
  const db = testEnv.unauthenticatedContext().firestore();

  await assertFails(
    setDoc(projectDocument(db, USER_A, PROJECT_A), {
      name: 'Denied',
    }),
  );
});

test('unauthenticated project read is denied', async () => {
  await seedOwnProject();
  const db = testEnv.unauthenticatedContext().firestore();

  await assertFails(getDoc(projectDocument(db, USER_A, PROJECT_A)));
});

test('unauthenticated project list is denied', async () => {
  await seedOwnProject();
  const db = testEnv.unauthenticatedContext().firestore();

  await assertFails(getDocs(collection(db, 'users', USER_A, 'projects')));
});

test('authenticated user A can create under own project path', async () => {
  const db = testEnv.authenticatedContext(USER_A).firestore();

  await assertSucceeds(
    setDoc(projectDocument(db, USER_A, PROJECT_A), {
      name: 'Proyecto A',
    }),
  );
});

test('authenticated user A can read own project', async () => {
  await seedOwnProject();
  const db = testEnv.authenticatedContext(USER_A).firestore();

  await assertSucceeds(getDoc(projectDocument(db, USER_A, PROJECT_A)));
});

test('authenticated user A can list own project collection', async () => {
  await seedOwnProject();
  const db = testEnv.authenticatedContext(USER_A).firestore();

  const snapshot = await assertSucceeds(
    getDocs(collection(db, 'users', USER_A, 'projects')),
  );
  assert.equal(snapshot.size, 1);
});

test('user B cannot read user A project', async () => {
  await seedOwnProject();
  const db = testEnv.authenticatedContext(USER_B).firestore();

  await assertFails(getDoc(projectDocument(db, USER_A, PROJECT_A)));
});

test('user B cannot list user A project collection', async () => {
  await seedOwnProject();
  const db = testEnv.authenticatedContext(USER_B).firestore();

  await assertFails(getDocs(collection(db, 'users', USER_A, 'projects')));
});

test('user A cannot write under user B project path', async () => {
  const db = testEnv.authenticatedContext(USER_A).firestore();

  await assertFails(
    setDoc(projectDocument(db, USER_B, 'project-b'), {
      name: 'Denied cross-user write',
    }),
  );
});

test('unrelated Firestore paths remain denied', async () => {
  const db = testEnv.authenticatedContext(USER_A).firestore();

  await assertFails(
    setDoc(doc(db, 'unrelated', 'document'), {
      value: true,
    }),
  );
});


function analysisDocument(
  db: ReturnType<RulesTestEnvironment['authenticatedContext']>['firestore'],
  userId: string,
  analysisId: string,
) {
  return doc(db, 'users', userId, 'projects', PROJECT_A, 'analyses', analysisId);
}

function reportDocument(
  db: ReturnType<RulesTestEnvironment['authenticatedContext']>['firestore'],
  userId: string,
  reportId: string,
) {
  return doc(db, 'users', userId, 'projects', PROJECT_A, 'reports', reportId);
}

test('own analysis metadata read/write is allowed', async () => {
  const db = testEnv.authenticatedContext(USER_A).firestore();
  const ref = analysisDocument(db, USER_A, 'analysis-a');

  await assertSucceeds(setDoc(ref, {
    reportType: 'TITLE_STUDY',
    createdAt: 'seed',
    updatedAt: 'seed',
    driveJsonFileId: 'drive-json-a',
  }));
  await assertSucceeds(getDoc(ref));
});

test('cross-user analysis metadata read/write is denied', async () => {
  const ownerDb = testEnv.authenticatedContext(USER_A).firestore();
  await assertSucceeds(setDoc(analysisDocument(ownerDb, USER_A, 'analysis-a'), {
    reportType: 'TITLE_STUDY',
  }));

  const otherDb = testEnv.authenticatedContext(USER_B).firestore();
  await assertFails(getDoc(analysisDocument(otherDb, USER_A, 'analysis-a')));
  await assertFails(setDoc(analysisDocument(otherDb, USER_A, 'analysis-b'), {
    reportType: 'TITLE_STUDY',
  }));
});

test('own report metadata read/write is allowed', async () => {
  const db = testEnv.authenticatedContext(USER_A).firestore();
  const ref = reportDocument(db, USER_A, 'report-a');

  await assertSucceeds(setDoc(ref, {
    analysisId: 'analysis-a',
    reportType: 'TITLE_STUDY',
    createdAt: 'seed',
    updatedAt: 'seed',
    driveDocxFileId: 'drive-docx-a',
  }));
  await assertSucceeds(getDoc(ref));
});

test('cross-user report metadata read/write is denied', async () => {
  const ownerDb = testEnv.authenticatedContext(USER_A).firestore();
  await assertSucceeds(setDoc(reportDocument(ownerDb, USER_A, 'report-a'), {
    analysisId: 'analysis-a',
    reportType: 'TITLE_STUDY',
  }));

  const otherDb = testEnv.authenticatedContext(USER_B).firestore();
  await assertFails(getDoc(reportDocument(otherDb, USER_A, 'report-a')));
  await assertFails(setDoc(reportDocument(otherDb, USER_A, 'report-b'), {
    analysisId: 'analysis-a',
    reportType: 'TITLE_STUDY',
  }));
});

test('unrelated nested project paths remain denied', async () => {
  const db = testEnv.authenticatedContext(USER_A).firestore();
  await assertFails(
    setDoc(doc(db, 'users', USER_A, 'projects', PROJECT_A, 'future', 'item'), {
      value: true,
    }),
  );
});
