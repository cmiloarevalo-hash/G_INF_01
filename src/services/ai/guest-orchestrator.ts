export type GuestAnalysisStatus = 'Pendiente' | 'Analizado' | 'No analizado';
export type GuestStatusUpdate<TFile> = (file: TFile, status: GuestAnalysisStatus, reason?: string) => void;

export interface GuestAnalysisCallbacks<TFile, TExtraction, TReport> {
  getName(file: TFile): string;
  getSize(file: TFile): number;
  extract(file: TFile, documentIndex: number): Promise<TExtraction>;
  synthesize(extractions: TExtraction[]): Promise<TReport>;
  onStatus: GuestStatusUpdate<TFile>;
  stopOnError(error: unknown): boolean;
}

export async function orchestrateGuestAnalysis<TFile, TExtraction, TReport>(
  files: TFile[],
  callbacks: GuestAnalysisCallbacks<TFile, TExtraction, TReport>,
): Promise<{ report: TReport; partial: boolean }> {
  const extractions: TExtraction[] = [];
  let omitted = false;
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]!;
    const name = callbacks.getName(file);
    const lowerName = name.toLowerCase();
    const pdf = lowerName.endsWith('.pdf');
    const supported = /\.(pdf|png|jpe?g|txt|md|markdown)$/i.test(name);
    const maxBytes = (pdf ? 50 : 70) * 1024 * 1024;
    if (!supported) {
      omitted = true;
      callbacks.onStatus(file, 'No analizado', 'Formato aún no procesado en este piloto; se conserva el archivo seleccionado.');
      continue;
    }
    if (callbacks.getSize(file) > maxBytes) {
      omitted = true;
      callbacks.onStatus(file, 'No analizado', pdf
        ? 'PDF superior al máximo inline de Gemini (50 MiB).'
        : 'Supera 70 MiB; el límite evita exceder 100 MB de payload Gemini tras codificación Base64.');
      continue;
    }
    callbacks.onStatus(file, 'Pendiente');
    try {
      extractions.push(await callbacks.extract(file, index));
      callbacks.onStatus(file, 'Analizado');
    } catch (error) {
      omitted = true;
      callbacks.onStatus(file, 'No analizado', error instanceof Error ? error.message : 'No fue posible analizar el archivo.');
      if (callbacks.stopOnError(error)) {
        for (const remaining of files.slice(index + 1)) {
          omitted = true;
          callbacks.onStatus(remaining, 'No analizado', 'Se detuvo el flujo por un error del proveedor; este archivo no se envió.');
        }
        break;
      }
    }
  }
  if (extractions.length === 0) throw new Error('Ningún archivo compatible produjo un extracto verificable. Revisa los estados y causas por archivo.');
  return { report: await callbacks.synthesize(extractions), partial: omitted || extractions.length !== files.length };
}
