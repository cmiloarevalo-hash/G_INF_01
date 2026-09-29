import * as React from 'react';
import { loadBrowserFirebaseConfig } from '../auth/config.js';
import {
  createAuthenticatedAiPreferenceService,
  createMemoryAiCredentialStore,
  type AuthenticatedAiPreferenceService,
  type SessionAiCredentialStore,
} from '../ai/preferences.js';
import { createDriveAuthorizationService } from '../drive/authorization.js';
import {
  createBrowserDriveAuthorizationAdapter,
  loadBrowserDrivePickerRuntime,
  resolveBrowserGoogleDriveConfig,
} from '../drive/browser-google.js';
import { createDriveClient } from '../drive/client.js';
import { createDrivePickerService } from '../drive/picker.js';
import { createProjectDriveFolderService } from '../drive/project-folders.js';
import {
  createDriveReferenceReader,
  type DriveReferenceReader,
} from '../drive/reference.js';
import type {
  DriveAuthorizationService,
  DrivePickerService,
  ProjectDriveFolderService,
} from '../drive/types.js';
import { createDriveLocalFileUploadService } from '../drive/upload.js';
import {
  createAnalysisPersistenceService,
  createArtifactHistoryService,
  createDocumentIncorporationService,
  createReportPersistenceService,
  type AnalysisPersistenceService,
  type ArtifactHistoryService,
  type DocumentIncorporationService,
  type ReportPersistenceService,
} from './authenticated-capabilities.js';
import { createBrowserTitleStudyReportRenderer } from './browser-report.js';
import { createAuthenticatedAnalysisHttpService } from './http-analysis.js';
import {
  createPersistedProjectAnalysisService,
  type PersistedProjectAnalysisService,
} from './project-analysis.js';
import {
  createAuthenticatedProjectDocumentService,
  type AuthenticatedProjectDocumentService,
} from '../firestore/authenticated-documents.js';
import {
  createAuthenticatedProjectAnalysisService,
  createAuthenticatedProjectReportService,
  createProjectAnalysisRepository,
  createProjectReportRepository,
  type AuthenticatedProjectAnalysisService,
  type AuthenticatedProjectReportService,
} from '../firestore/artifacts.js';
import { createProjectDocumentRepository } from '../firestore/document-service.js';
import { createFirestoreAiPreferenceRepository } from '../firestore/firebase-ai-preferences.js';
import {
  createFirestoreProjectAnalysisDriver,
  createFirestoreProjectReportDriver,
} from '../firestore/firebase-artifacts.js';
import { createFirestoreProjectDocumentDriver } from '../firestore/firebase-documents.js';
import { createProjectService } from '../firestore/runtime.js';
import type { AuthenticatedProjectService } from '../firestore/authenticated.js';

export interface ProductRuntimeServices {
  projects: AuthenticatedProjectService;
  documents: AuthenticatedProjectDocumentService;
  analyses: AuthenticatedProjectAnalysisService;
  reports: AuthenticatedProjectReportService;
  incorporation: DocumentIncorporationService;
  analysisPersistence: AnalysisPersistenceService;
  reportPersistence: ReportPersistenceService;
  history: ArtifactHistoryService;
  projectAnalysis: PersistedProjectAnalysisService;
  aiPreferences: AuthenticatedAiPreferenceService;
  aiCredentials: SessionAiCredentialStore;
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
  const analyses = createAuthenticatedProjectAnalysisService(
    createProjectAnalysisRepository(
      createFirestoreProjectAnalysisDriver(firebaseResolution.config),
    ),
  );
  const reports = createAuthenticatedProjectReportService(
    createProjectReportRepository(
      createFirestoreProjectReportDriver(firebaseResolution.config),
    ),
  );
  const aiPreferences = createAuthenticatedAiPreferenceService(
    createFirestoreAiPreferenceRepository(firebaseResolution.config),
  );
  const aiCredentials = createMemoryAiCredentialStore();

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

  const incorporation = createDocumentIncorporationService(
    projects,
    upload,
    picker,
    documents,
  );
  const analysisPersistence = createAnalysisPersistenceService(
    projects,
    upload,
    analyses,
  );
  const reportPersistence = createReportPersistenceService(
    projects,
    upload,
    reports,
    createBrowserTitleStudyReportRenderer(),
  );
  const configuredAnalysis = createAuthenticatedAnalysisHttpService(
    aiPreferences,
    aiCredentials,
  );

  return {
    projects,
    documents,
    analyses,
    reports,
    incorporation,
    analysisPersistence,
    reportPersistence,
    history: createArtifactHistoryService(analyses, reports, driveReader),
    projectAnalysis: createPersistedProjectAnalysisService(
      documents,
      driveReader,
      configuredAnalysis,
      analysisPersistence,
    ),
    aiPreferences,
    aiCredentials,
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
