import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuthSessionState } from '../src/services/auth/types.js';
import {
  createProjectDriveFolderLinkService,
  ProjectDriveFolderLinkError,
} from '../src/services/application/project-drive-folders.js';
import type {
  DriveAuthorizationService,
  ProjectDriveFolders,
  ProjectDriveFolderService,
} from '../src/services/drive/types.js';
import type { AuthenticatedProjectService } from '../src/services/firestore/authenticated.js';
import type { ProjectMetadata } from '../src/services/firestore/types.js';

const session: AuthSessionState = {
  status: 'authenticated',
  user: {
    uid: 'uid-a',
    displayName: null,
    email: null,
    photoURL: null,
  },
};

const project: ProjectMetadata = {
  id: 'project-a',
  name: 'Proyecto A',
  createdAt: null,
  updatedAt: null,
};

const confirmedFolders: ProjectDriveFolders = {
  applicationRootId: 'app-root',
  projectsRootId: 'projects-root',
  projectFolderId: 'project-folder',
  documentsFolderId: 'documents-folder',
  analysisFolderId: 'analysis-folder',
  reportsFolderId: 'reports-folder',
};

function authorizedDrive(): DriveAuthorizationService {
  return {
    getState: () => ({ status: 'authorized' }),
    authorize: async () => undefined,
    getAccessToken: () => 'drive-token',
    clear: () => undefined,
    requireReauthorization: () => undefined,
  };
}

test('Drive folder retry reuses confirmed refs after Firestore link failure without reprovisioning', async () => {
  let provisionCalls = 0;
  let updateCalls = 0;

  const driveFolders: ProjectDriveFolderService = {
    async provision() {
      provisionCalls += 1;
      return confirmedFolders;
    },
  };

  const projects: AuthenticatedProjectService = {
    async create() {
      throw new Error('not used');
    },
    async list() {
      throw new Error('not used');
    },
    async get() {
      throw new Error('not used');
    },
    async updateDriveFolders(_session, projectId, folders) {
      updateCalls += 1;
      assert.equal(projectId, 'project-a');
      assert.deepEqual(folders, confirmedFolders);
      if (updateCalls === 1) {
        throw new Error('firestore unavailable');
      }
      return {
        ...project,
        driveFolders: folders,
      };
    },
  };

  const service = createProjectDriveFolderLinkService(
    projects,
    authorizedDrive(),
    driveFolders,
  );

  await assert.rejects(
    service.prepare(session, project),
    (error) =>
      error instanceof ProjectDriveFolderLinkError &&
      error.confirmedFolders === confirmedFolders &&
      /reintento reutilizará/.test(error.message),
  );

  const recovered = await service.prepare(session, project);

  assert.deepEqual(recovered.driveFolders, confirmedFolders);
  assert.equal(provisionCalls, 1);
  assert.equal(updateCalls, 2);
});

test('session clear discards pending folder recovery refs instead of sharing them across users', async () => {
  let provisionCalls = 0;
  let updateCalls = 0;

  const service = createProjectDriveFolderLinkService(
    {
      async create() {
        throw new Error('not used');
      },
      async list() {
        throw new Error('not used');
      },
      async get() {
        throw new Error('not used');
      },
      async updateDriveFolders() {
        updateCalls += 1;
        if (updateCalls === 1) throw new Error('link failed');
        return { ...project, driveFolders: confirmedFolders };
      },
    },
    authorizedDrive(),
    {
      async provision() {
        provisionCalls += 1;
        return confirmedFolders;
      },
    },
  );

  await assert.rejects(service.prepare(session, project));
  service.clear();

  const sessionB: AuthSessionState = {
    status: 'authenticated',
    user: {
      uid: 'uid-b',
      displayName: null,
      email: null,
      photoURL: null,
    },
  };

  await service.prepare(sessionB, project);
  assert.equal(provisionCalls, 2);
});
