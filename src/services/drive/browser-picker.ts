import type {
  DrivePickerBuilder,
  DrivePickerBuiltInstance,
  DrivePickerRuntime,
  DrivePickerRuntimeCallback,
} from './types.js';

interface GooglePickerBuilderLike {
  setDeveloperKey(value: string): GooglePickerBuilderLike;
  setAppId(value: string): GooglePickerBuilderLike;
  setOAuthToken(value: string): GooglePickerBuilderLike;
  addView(value: unknown): GooglePickerBuilderLike;
  enableFeature(value: unknown): GooglePickerBuilderLike;
  setCallback(callback: (data: Record<string, unknown>) => void): GooglePickerBuilderLike;
  build(): { setVisible(visible: boolean): void };
}

interface GooglePickerNamespaceLike {
  PickerBuilder: new () => GooglePickerBuilderLike;
  ViewId: { DOCS: unknown };
  Feature: { MULTISELECT_ENABLED: unknown };
  Action: { PICKED: unknown; CANCEL: unknown };
  Response?: {
    ACTION?: string;
    DOCUMENTS?: string;
  };
  Document?: {
    ID?: string;
    NAME?: string;
    MIME_TYPE?: string;
    URL?: string;
  };
}

interface GooglePickerHostLike {
  google?: {
    picker?: GooglePickerNamespaceLike;
  };
}

export class BrowserDrivePickerRuntimeError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'BrowserDrivePickerRuntimeError';
  }
}

function requirePicker(host: GooglePickerHostLike): GooglePickerNamespaceLike {
  const picker = host.google?.picker;
  if (
    !picker ||
    typeof picker.PickerBuilder !== 'function' ||
    !picker.ViewId ||
    !picker.Feature ||
    !picker.Action
  ) {
    throw new BrowserDrivePickerRuntimeError(
      'Google Picker browser runtime is unavailable.',
    );
  }
  return picker;
}

function callbackValue(
  data: Record<string, unknown>,
  preferredKey: string | undefined,
  fallbackKey: string,
): unknown {
  return data[preferredKey ?? fallbackKey] ?? data[fallbackKey];
}

function mapDocument(
  value: unknown,
  picker: GooglePickerNamespaceLike,
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  const keys = picker.Document ?? {};

  return {
    id: callbackValue(record, keys.ID, 'id'),
    name: callbackValue(record, keys.NAME, 'name'),
    mimeType: callbackValue(record, keys.MIME_TYPE, 'mimeType'),
    url: callbackValue(record, keys.URL, 'url'),
  };
}

function mapCallback(
  data: Record<string, unknown>,
  picker: GooglePickerNamespaceLike,
): Parameters<DrivePickerRuntimeCallback>[0] {
  const action = callbackValue(
    data,
    picker.Response?.ACTION,
    'action',
  );

  if (action === picker.Action.CANCEL || action === 'cancel') {
    return { action: 'cancelled' };
  }

  if (action === picker.Action.PICKED || action === 'picked') {
    const documents = callbackValue(
      data,
      picker.Response?.DOCUMENTS,
      'docs',
    );

    return {
      action: 'picked',
      documents: Array.isArray(documents)
        ? documents.map((item) => mapDocument(item, picker))
        : documents,
    };
  }

  return { action: String(action ?? 'unknown') };
}

export function createBrowserDrivePickerRuntime(
  host: GooglePickerHostLike = globalThis as unknown as GooglePickerHostLike,
): DrivePickerRuntime {
  return {
    createBuilder() {
      const picker = requirePicker(host);
      const nativeBuilder = new picker.PickerBuilder();

      const builder: DrivePickerBuilder = {
        setDeveloperKey(value) {
          nativeBuilder.setDeveloperKey(value);
          return builder;
        },

        setAppId(value) {
          nativeBuilder.setAppId(value);
          return builder;
        },

        setOAuthToken(value) {
          nativeBuilder.setOAuthToken(value);
          return builder;
        },

        addDriveDocumentsView() {
          nativeBuilder.addView(picker.ViewId.DOCS);
          return builder;
        },

        enableMultiselect() {
          nativeBuilder.enableFeature(picker.Feature.MULTISELECT_ENABLED);
          return builder;
        },

        setCallback(callback) {
          nativeBuilder.setCallback((data) => {
            callback(mapCallback(data, picker));
          });
          return builder;
        },

        build(): DrivePickerBuiltInstance {
          const nativePicker = nativeBuilder.build();
          return {
            setVisible(visible) {
              nativePicker.setVisible(visible);
            },
          };
        },
      };

      return builder;
    },
  };
}
