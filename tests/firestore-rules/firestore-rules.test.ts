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
  updateDoc,
} from 'firebase/firestore';

const PROJECT_ID = 'demo-g-inf-01';
const USER_A = 'user-a';
const USER_B = 'user-b';
const PROJECT_A = 'project-a';
const DRIVE_FOLDERS = {
  applicationRootId: 'app-root',
  projectsRootId: 'projects-root',
  projectFolderId: 'project-folder',
  documentsFolderId: 'documents-folder',
  analysisFolderId: 'analysis-folder',
  reportsFolderId: 'reports-folder',
};

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

test('authenticated user can update Drive refs on own existing project', async () => {
  await seedOwnProject();
  const db = testEnv.authenticatedContext(USER_A).firestore();
  const ref = projectDocument(db, USER_A, PROJECT_A);

  await assertSucceeds(
    updateDoc(ref, {
      driveFolders: DRIVE_FOLDERS,
      updatedAt: 'updated',
    }),
  );

  const snapshot = await assertSucceeds(getDoc(ref));
  assert.deepEqual(snapshot.data()?.driveFolders, DRIVE_FOLDERS);
});

test('user B cannot update Drive refs on user A project', async () => {
  await seedOwnProject();
  const db = testEnv.authenticatedContext(USER_B).firestore();

  await assertFails(
    updateDoc(projectDocument(db, USER_A, PROJECT_A), {
      driveFolders: DRIVE_FOLDERS,
      updatedAt: 'denied',
    }),
  );
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
