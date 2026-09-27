import type {
  DriveAuthorizationService,
  DrivePickerConfig,
  DrivePickerDocument,
  DrivePickerOutcome,
  DrivePickerRuntime,
  DrivePickerRuntimeCallbackData,
  DrivePickerService,
} from './types.js';

export type DrivePickerErrorStage =
  | 'authorization'
  | 'configuration'
  | 'runtime'
  | 'callback';

export class DrivePickerError extends Error {
  readonly stage: DrivePickerErrorStage;

  constructor(
    message: string,
    stage: DrivePickerErrorStage,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'DrivePickerError';
    this.stage = stage;
  }
}

function requireConfigValue(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new DrivePickerError(`${label} is required.`, 'configuration');
  }
  return normalized;
}

function optionalConfirmedText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function mapPickedDocuments(value: unknown): DrivePickerDocument[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new DrivePickerError(
      'Google Picker reported a successful selection without documents.',
      'callback',
    );
  }

  return value.map((candidate, index) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new DrivePickerError(
        `Google Picker document ${index + 1} is malformed.`,
        'callback',
      );
    }

    const record = candidate as Record<string, unknown>;
    const id = optionalConfirmedText(record.id);
    if (!id) {
      throw new DrivePickerError(
        `Google Picker document ${index + 1} has no confirmed file ID.`,
        'callback',
      );
    }

    const name = optionalConfirmedText(record.name);
    const mimeType = optionalConfirmedText(record.mimeType);
    const url = optionalConfirmedText(record.url);

    return {
      id,
      ...(name ? { name } : {}),
      ...(mimeType ? { mimeType } : {}),
      ...(url ? { url } : {}),
    };
  });
}

function mapCallback(data: DrivePickerRuntimeCallbackData): DrivePickerOutcome {
  if (!data || typeof data !== 'object') {
    throw new DrivePickerError('Google Picker callback payload is invalid.', 'callback');
  }

  if (data.action === 'cancelled') {
    return { status: 'cancelled' };
  }

  if (data.action !== 'picked') {
    throw new DrivePickerError(
      `Google Picker returned an unsupported callback action: ${data.action}.`,
      'callback',
    );
  }

  return {
    status: 'picked',
    documents: mapPickedDocuments(data.documents),
  };
}

export function createDrivePickerService(
  authorization: DriveAuthorizationService,
  config: DrivePickerConfig,
  runtime: DrivePickerRuntime,
): DrivePickerService {
  return {
    async open() {
      const accessToken = authorization.getAccessToken()?.trim();
      if (!accessToken) {
        throw new DrivePickerError(
          'Drive authorization is required before opening Google Picker.',
          'authorization',
        );
      }

      const developerKey = requireConfigValue(
        config.developerKey,
        'Google Picker developer key',
      );
      const appId = requireConfigValue(config.appId, 'Google Picker App ID');

      return new Promise<DrivePickerOutcome>((resolve, reject) => {
        let settled = false;

        const settleCallback = (data: DrivePickerRuntimeCallbackData) => {
          if (settled) return;

          try {
            const outcome = mapCallback(data);
            settled = true;
            resolve(outcome);
          } catch (error) {
            settled = true;
            reject(
              error instanceof DrivePickerError
                ? error
                : new DrivePickerError(
                  'Google Picker callback handling failed.',
                  'callback',
                  { cause: error },
                ),
            );
          }
        };

        try {
          const picker = runtime
            .createBuilder()
            .setDeveloperKey(developerKey)
            .setAppId(appId)
            .setOAuthToken(accessToken)
            .addDriveDocumentsView()
            .enableMultiselect()
            .setCallback(settleCallback)
            .build();

          picker.setVisible(true);
        } catch (error) {
          if (settled) return;
          settled = true;
          reject(
            error instanceof DrivePickerError
              ? error
              : new DrivePickerError(
                'Google Picker runtime failed while opening the picker.',
                'runtime',
                { cause: error },
              ),
          );
        }
      });
    },
  };
}
