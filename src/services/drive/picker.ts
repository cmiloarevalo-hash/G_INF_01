export interface DrivePickerConfiguration {
  accessToken: string;
  apiKey: string;
  appId: string;
}

export interface DrivePickerFile {
  id: string;
  name: string;
  mimeType?: string;
}

export type DrivePickerGatewayResult =
  | { status: 'selected'; file: DrivePickerFile }
  | { status: 'cancelled' };

export interface DrivePickerGateway {
  open(configuration: DrivePickerConfiguration): Promise<DrivePickerGatewayResult>;
}

export type DrivePickerResult =
  | { status: 'selected'; file: DrivePickerFile }
  | { status: 'cancelled' };

export class DrivePickerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DrivePickerError';
  }
}

function requireValue(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new DrivePickerError(`Se requiere ${label} para abrir Google Picker.`);
  return normalized;
}

function selectedFile(file: DrivePickerFile): DrivePickerFile {
  const id = requireValue(file.id, 'ID de archivo');
  const name = requireValue(file.name, 'nombre de archivo');
  const mimeType = file.mimeType?.trim();
  return mimeType ? { id, name, mimeType } : { id, name };
}

export function createDrivePickerService(gateway: DrivePickerGateway) {
  return {
    async openPicker(configuration: DrivePickerConfiguration): Promise<DrivePickerResult> {
      const request: DrivePickerConfiguration = {
        accessToken: requireValue(configuration.accessToken, 'token de acceso'),
        apiKey: requireValue(configuration.apiKey, 'API key'),
        appId: requireValue(configuration.appId, 'identificador de aplicación/proyecto'),
      };

      try {
        const result = await gateway.open(request);
        if (result.status === 'cancelled') return { status: 'cancelled' };
        return { status: 'selected', file: selectedFile(result.file) };
      } catch (cause) {
        const detail = cause instanceof Error && cause.message
          ? cause.message
          : 'error desconocido';
        throw new DrivePickerError(`Google Picker falló: ${detail}`);
      }
    },
  };
}
