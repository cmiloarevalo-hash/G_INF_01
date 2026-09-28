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
const DOCUMENT_A = 'document-a';
const DRIVE_FOLDERS = {
  applicationRootId: 'app-root',
  projectsRootId: 'projects-root',
  projectFolderId: 'project-folder',
  documentsFolderId: 'documents-folder',
  analysisFolderId: 'analysis-folder',
  reportsFolderId: 'reports-folder',
};
const DOCUMENT_METADATA = {
  driveFileId: 'drive-file-1',
  name: 'Documento.pdf',
  mimeType: 'application/pdf',
  source: 'local-upload',
  createdAt: 'seed',
  updatedAt: 'seed',
};

let testEnv: RulesTestEnvironment;

function projectDocument(
  db: ReturnType<RulesTestEnvironment['authenticatedContext']>['firestore'],
  userId: string,
  projectId: string,
) {
  return doc(db, 'users', userId, 'projects', projectId);
}

function projectDocumentMetadata(
  db: ReturnType<RulesTestEnvironment['authenticatedContext']>['firestore'],
  userId: string,
  projectId: string,
  documentId: string,
) {
  return doc(
    db,
    'users',
    userId,
    'projects',
    projectId,
    'documents',
    documentId,
  );
}

function projectDocumentsCollection(
  db: ReturnType<RulesTestEnvironment['authenticatedContext']>['firestore'],
  userId: string,
  projectId: string,
) {
  return collection(db, 'users', userId, 'projects', projectId, 'documents');
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

async function seedOwnDocument(
  userId = USER_A,
  projectId = PROJECT_A,
  documentId = DOCUMENT_A,
) {
  const db = testEnv.authenticatedContext(userId).firestore();
  await assertSucceeds(
    setDoc(projectDocumentMetadata(db, userId, projectId, documentId), {
      ...DOCUMENT_METADATA,
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

test('unauthenticated document create is denied', async () => {
  const db = testEnv.unauthenticatedContext().firestore();

  await assertFails(
    setDoc(projectDocumentMetadata(db, USER_A, PROJECT_A, DOCUMENT_A), {
      ...DOCUMENT_METADATA,
    }),
  );
});

test('unauthenticated document read is denied', async () => {
  await seedOwnDocument();
  const db = testEnv.unauthenticatedContext().firestore();

  await assertFails(
    getDoc(projectDocumentMetadata(db, USER_A, PROJECT_A, DOCUMENT_A)),
  );
});

test('unauthenticated document list is denied', async () => {
  await seedOwnDocument();
  const db = testEnv.unauthenticatedContext().firestore();

  await assertFails(
    getDocs(projectDocumentsCollection(db, USER_A, PROJECT_A)),
  );
});

test('authenticated owner can create and read own document metadata', async () => {
  const db = testEnv.authenticatedContext(USER_A).firestore();
  const ref = projectDocumentMetadata(db, USER_A, PROJECT_A, DOCUMENT_A);

  await assertSucceeds(setDoc(ref, { ...DOCUMENT_METADATA }));
  const snapshot = await assertSucceeds(getDoc(ref));

  assert.equal(snapshot.data()?.driveFileId, 'drive-file-1');
});

test('authenticated owner can list own document metadata', async () => {
  await seedOwnDocument();
  const db = testEnv.authenticatedContext(USER_A).firestore();

  const snapshot = await assertSucceeds(
    getDocs(projectDocumentsCollection(db, USER_A, PROJECT_A)),
  );
  assert.equal(snapshot.size, 1);
});

test('authenticated owner can update own document metadata', async () => {
  await seedOwnDocument();
  const db = testEnv.authenticatedContext(USER_A).firestore();
  const ref = projectDocumentMetadata(db, USER_A, PROJECT_A, DOCUMENT_A);

  await assertSucceeds(updateDoc(ref, { updatedAt: 'updated' }));
});

test('user B cannot read user A document metadata', async () => {
  await seedOwnDocument();
  const db = testEnv.authenticatedContext(USER_B).firestore();

  await assertFails(
    getDoc(projectDocumentMetadata(db, USER_A, PROJECT_A, DOCUMENT_A)),
  );
});

test('user B cannot list user A document metadata', async () => {
  await seedOwnDocument();
  const db = testEnv.authenticatedContext(USER_B).firestore();

  await assertFails(
    getDocs(projectDocumentsCollection(db, USER_A, PROJECT_A)),
  );
});

test('user B cannot write user A document metadata', async () => {
  const db = testEnv.authenticatedContext(USER_B).firestore();

  await assertFails(
    setDoc(projectDocumentMetadata(db, USER_A, PROJECT_A, DOCUMENT_A), {
      ...DOCUMENT_METADATA,
      driveFileId: 'cross-user-denied',
    }),
  );
});

test('user A cannot write document metadata under user B project path', async () => {
  const db = testEnv.authenticatedContext(USER_A).firestore();

  await assertFails(
    setDoc(projectDocumentMetadata(db, USER_B, 'project-b', DOCUMENT_A), {
      ...DOCUMENT_METADATA,
    }),
  );
});

test('unrelated nested project subcollections remain denied', async () => {
  const db = testEnv.authenticatedContext(USER_A).firestore();

  await assertFails(
    setDoc(
      doc(
        db,
        'users',
        USER_A,
        'projects',
        PROJECT_A,
        'drafts',
        'draft-a',
      ),
      { value: true },
    ),
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

test('rules do not introduce recursive wildcard authorization', () => {
  const source = readFileSync('firestore.rules', 'utf8');
  assert.doesNotMatch(source, /\{document=\*\*\}/);
});


function artifactDocument(
  db: ReturnType<RulesTestEnvironment['authenticatedContext']>['firestore'],
  userId: string,
  projectId: string,
  collectionName: 'analyses' | 'reports',
  artifactId: string,
) {
  return doc(
    db,
    'users',
    userId,
    'projects',
    projectId,
    collectionName,
    artifactId,
  );
}

function artifactCollection(
  db: ReturnType<RulesTestEnvironment['authenticatedContext']>['firestore'],
  userId: string,
  projectId: string,
  collectionName: 'analyses' | 'reports',
) {
  return collection(
    db,
    'users',
    userId,
    'projects',
    projectId,
    collectionName,
  );
}

const ARTIFACT_METADATA = {
  driveFileId: 'drive-artifact-1',
  name: 'artifact',
  mimeType: 'application/octet-stream',
  createdAt: 'seed',
  updatedAt: 'seed',
};

for (const collectionName of ['analyses', 'reports'] as const) {
  test(`unauthenticated ${collectionName} create/read/list are denied`, async () => {
    const unauthenticated = testEnv.unauthenticatedContext().firestore();

    await assertFails(
      setDoc(
        artifactDocument(
          unauthenticated,
          USER_A,
          PROJECT_A,
          collectionName,
          'artifact-a',
        ),
        ARTIFACT_METADATA,
      ),
    );

    const owner = testEnv.authenticatedContext(USER_A).firestore();
    await assertSucceeds(
      setDoc(
        artifactDocument(owner, USER_A, PROJECT_A, collectionName, 'artifact-a'),
        ARTIFACT_METADATA,
      ),
    );

    await assertFails(
      getDoc(
        artifactDocument(
          unauthenticated,
          USER_A,
          PROJECT_A,
          collectionName,
          'artifact-a',
        ),
      ),
    );
    await assertFails(
      getDocs(
        artifactCollection(
          unauthenticated,
          USER_A,
          PROJECT_A,
          collectionName,
        ),
      ),
    );
  });

  test(`owner can create/read/list ${collectionName} metadata`, async () => {
    const db = testEnv.authenticatedContext(USER_A).firestore();
    const ref = artifactDocument(
      db,
      USER_A,
      PROJECT_A,
      collectionName,
      'artifact-a',
    );

    await assertSucceeds(setDoc(ref, ARTIFACT_METADATA));
    await assertSucceeds(getDoc(ref));
    const listed = await assertSucceeds(
      getDocs(artifactCollection(db, USER_A, PROJECT_A, collectionName)),
    );
    assert.equal(listed.size, 1);
  });

  test(`cross-user ${collectionName} read/list/write are denied`, async () => {
    const owner = testEnv.authenticatedContext(USER_A).firestore();
    await assertSucceeds(
      setDoc(
        artifactDocument(owner, USER_A, PROJECT_A, collectionName, 'artifact-a'),
        ARTIFACT_METADATA,
      ),
    );

    const other = testEnv.authenticatedContext(USER_B).firestore();
    await assertFails(
      getDoc(
        artifactDocument(other, USER_A, PROJECT_A, collectionName, 'artifact-a'),
      ),
    );
    await assertFails(
      getDocs(artifactCollection(other, USER_A, PROJECT_A, collectionName)),
    );
    await assertFails(
      setDoc(
        artifactDocument(other, USER_A, PROJECT_A, collectionName, 'artifact-b'),
        ARTIFACT_METADATA,
      ),
    );
  });
}

test('AI preference rules isolate exact user preference document', async () => {
  const owner = testEnv.authenticatedContext(USER_A).firestore();
  const other = testEnv.authenticatedContext(USER_B).firestore();
  const unauthenticated = testEnv.unauthenticatedContext().firestore();
  const preference = doc(owner, 'users', USER_A, 'preferences', 'ai');

  await assertSucceeds(setDoc(preference, {
    provider: 'gemini',
    model: 'gemini-3.6-flash',
  }));
  await assertSucceeds(getDoc(preference));

  await assertFails(
    getDoc(doc(other, 'users', USER_A, 'preferences', 'ai')),
  );
  await assertFails(
    setDoc(doc(other, 'users', USER_A, 'preferences', 'ai'), {
      provider: 'gemini',
      model: 'gemini-3.6-flash',
    }),
  );
  await assertFails(
    getDoc(doc(unauthenticated, 'users', USER_A, 'preferences', 'ai')),
  );
});

test('unrelated preference documents remain denied', async () => {
  const db = testEnv.authenticatedContext(USER_A).firestore();

  await assertFails(
    setDoc(doc(db, 'users', USER_A, 'preferences', 'other'), {
      value: true,
    }),
  );
});
