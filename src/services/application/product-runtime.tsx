import * as React from 'react';
import { loadBrowserFirebaseConfig } from '../auth/config.js';
import {
  createDriveAuthorizationService,
} from '../drive/authorization.js';
import {
  createBrowserDriveAuthorizationAdapter,
  loadBrowserDrivePickerRuntime,
  resolveBrowserGoogleDriveConfig,
} from '../drive/browser-google.js';
import { createDriveClient } from '../drive/client.js';
import { createDrivePickerService } from '../drive/picker.js';
import { createProjectDriveFolderService } from '../drive/project-folders.js';
import { createDriveReferenceReader } from '../drive/reference.js';
import type {
  DriveAuthorizationService,
  DrivePickerService,
  ProjectDriveFolderService,
} from '../drive/types.js';
import { createDriveLocalFileUploadService } from '../drive/upload.js';
import {
  createDocumentIncorporationService,
  type DocumentIncorporationService,
} from './authenticated-capabilities.js';
import {
  createAuthenticatedProjectDocumentService,
  type AuthenticatedProjectDocumentService,
} from '../firestore/authenticated-documents.js';
import { createProjectDocumentRepository } from '../firestore/document-service.js';
import { createFirestoreProjectDocumentDriver } from '../firestore/firebase-documents.js';
import { createProjectService } from '../firestore/runtime.js';
import type { AuthenticatedProjectService } from '../firestore/authenticated.js';
import type { DriveReferenceReader } from '../drive/reference.js';

export interface ProductRuntimeServices {
  projects: AuthenticatedProjectService;
  documents: AuthenticatedProjectDocumentService;
  incorporation: DocumentIncorporationService;
  driveAuthorization: DriveAuthorizationService;
  driveFolders: ProjectDriveFolderService;
  driveReader: DriveReferenceReader;
}

export type ProductRuntimeState =
  | { status: 'checking' }
  | { status: 'unavailable'; reason: string }
  | { status: 'available'; services: ProductRuntimeServices };

async function createBrowserProductServices(): Promise<ProductRuntimeServices> {
  const [firebaseResolution, googleResolution] = await Promise.all([
    loadBrowserFirebaseConfig(),
    Promise.resolve(resolveBrowserGoogleDriveConfig()),
  ]);

  if (!firebaseResolution.available) {
    throw new Error(
      `Falta configuración Firebase: ${firebaseResolution.missing.join(', ')}`,
    );
  }
  if (!googleResolution.available) {
    throw new Error(
      `Falta configuración Google Drive/Picker: ${googleResolution.missing.join(', ')}`,
    );
  }

  const projects = createProjectService(firebaseResolution.config);
  const driveAuthorization = createDriveAuthorizationService(
    createBrowserDriveAuthorizationAdapter(googleResolution.config),
  );
  const upload = createDriveLocalFileUploadService(driveAuthorization, fetch);
  const driveReader = createDriveReferenceReader(driveAuthorization, fetch);
  const driveFolders = createProjectDriveFolderService(
    driveAuthorization,
    createDriveClient(fetch),
  );
  const documents = createAuthenticatedProjectDocumentService(
    createProjectDocumentRepository(
      createFirestoreProjectDocumentDriver(firebaseResolution.config),
    ),
  );

  const picker: DrivePickerService = {
    async open() {
      const runtime = await loadBrowserDrivePickerRuntime();
      return createDrivePickerService(
        driveAuthorization,
        {
          developerKey: googleResolution.config.pickerDeveloperKey,
          appId: googleResolution.config.pickerAppId,
        },
        runtime,
      ).open();
    },
  };

  return {
    projects,
    documents,
    incorporation: createDocumentIncorporationService(
      projects,
      upload,
      picker,
      documents,
    ),
    driveAuthorization,
    driveFolders,
    driveReader,
  };
}

const ProductRuntimeContext = React.createContext<ProductRuntimeState | null>(null);

export function ProductRuntimeProvider({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [state, setState] = React.useState<ProductRuntimeState>({
    status: 'checking',
  });

  React.useEffect(() => {
    let active = true;
    void createBrowserProductServices()
      .then((services) => {
        if (active) setState({ status: 'available', services });
      })
      .catch((error) => {
        if (!active) return;
        setState({
          status: 'unavailable',
          reason: error instanceof Error
            ? error.message
            : 'La integración autenticada no pudo inicializarse.',
        });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <ProductRuntimeContext.Provider value={state}>
      {children}
    </ProductRuntimeContext.Provider>
  );
}

export function useProductRuntime(): ProductRuntimeState {
  const value = React.useContext(ProductRuntimeContext);
  if (!value) {
    throw new Error(
      'useProductRuntime debe usarse dentro de ProductRuntimeProvider.',
    );
  }
  return value;
}
