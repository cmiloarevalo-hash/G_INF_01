import assert from 'node:assert/strict';
import test from 'node:test';
import { createMemoryAiCredentialStore } from '../src/services/ai/preferences.js';
import type { AuthSessionState } from '../src/services/auth/types.js';
import {
  createDriveAuthorizationService,
} from '../src/services/drive/authorization.js';
import type { ProjectMetadata } from '../src/services/firestore/types.js';
import {
  createMemoryInstructionStore,
} from '../src/services/application/product-runtime.js';
import {
  clearProductSessionEphemeralState,
  createSessionIsolationGuard,
} from '../src/services/application/session-isolation.js';

const sessionA: AuthSessionState = {
  status: 'authenticated',
  user: {
    uid: 'uid-a',
    displayName: 'A',
    email: null,
    photoURL: null,
  },
};

const sessionB: AuthSessionState = {
  status: 'authenticated',
  user: {
    uid: 'uid-b',
    displayName: 'B',
    email: null,
    photoURL: null,
  },
};

const projectA: ProjectMetadata = {
  id: 'project-a',
  name: 'Proyecto A',
  createdAt: null,
  updatedAt: null,
};

test('session boundary clears Drive token, AI credential/instruction and selected project across A -> sign-out -> B', async () => {
  const driveAuthorization = createDriveAuthorizationService({
    async requestAccessToken() {
      return { accessToken: 'drive-token-a' };
    },
  });
  const aiCredentials = createMemoryAiCredentialStore();
  const aiInstruction = createMemoryInstructionStore();

  let selectedProject: ProjectMetadata | null = null;
  let currentSection = 'inicio';

  const runtimeBoundary = createSessionIsolationGuard(() => {
    clearProductSessionEphemeralState({
      driveAuthorization,
      aiCredentials,
      aiInstruction,
    });
  });
  const uiBoundary = createSessionIsolationGuard(() => {
    selectedProject = null;
    currentSection = 'inicio';
  });

  assert.equal(runtimeBoundary.transition(sessionA), false);
  assert.equal(uiBoundary.transition(sessionA), false);

  await driveAuthorization.authorize();
  aiCredentials.set('api-key-a');
  aiInstruction.set('instrucción A');
  selectedProject = projectA;
  currentSection = 'workspace-proyecto';

  assert.equal(driveAuthorization.getAccessToken(), 'drive-token-a');
  assert.equal(aiCredentials.get(), 'api-key-a');
  assert.equal(aiInstruction.get(), 'instrucción A');
  assert.equal(selectedProject?.id, 'project-a');
  assert.equal(currentSection, 'workspace-proyecto');

  const signedOut: AuthSessionState = { status: 'unauthenticated' };
  assert.equal(runtimeBoundary.transition(signedOut), true);
  assert.equal(uiBoundary.transition(signedOut), true);

  assert.equal(driveAuthorization.getAccessToken(), null);
  assert.equal(aiCredentials.get(), null);
  assert.equal(aiInstruction.get(), '');
  assert.equal(selectedProject, null);
  assert.equal(currentSection, 'inicio');

  assert.equal(runtimeBoundary.transition(sessionB), true);
  assert.equal(uiBoundary.transition(sessionB), true);

  assert.equal(runtimeBoundary.getCurrentUid(), 'uid-b');
  assert.equal(uiBoundary.getCurrentUid(), 'uid-b');
  assert.equal(driveAuthorization.getAccessToken(), null);
  assert.equal(aiCredentials.get(), null);
  assert.equal(aiInstruction.get(), '');
  assert.equal(selectedProject, null);
  assert.equal(currentSection, 'inicio');
});

test('direct authenticated UID A -> UID B transition clears ephemeral and project UI state', async () => {
  const driveAuthorization = createDriveAuthorizationService({
    async requestAccessToken() {
      return { accessToken: 'drive-token-a' };
    },
  });
  const aiCredentials = createMemoryAiCredentialStore();
  const aiInstruction = createMemoryInstructionStore();
  let selectedProject: ProjectMetadata | null = null;

  const runtimeBoundary = createSessionIsolationGuard(() => {
    clearProductSessionEphemeralState({
      driveAuthorization,
      aiCredentials,
      aiInstruction,
    });
  });
  const uiBoundary = createSessionIsolationGuard(() => {
    selectedProject = null;
  });

  runtimeBoundary.transition(sessionA);
  uiBoundary.transition(sessionA);
  await driveAuthorization.authorize();
  aiCredentials.set('api-key-a');
  aiInstruction.set('instruction-a');
  selectedProject = projectA;

  runtimeBoundary.transition(sessionB);
  uiBoundary.transition(sessionB);

  assert.equal(driveAuthorization.getAccessToken(), null);
  assert.equal(aiCredentials.get(), null);
  assert.equal(aiInstruction.get(), '');
  assert.equal(selectedProject, null);
});
