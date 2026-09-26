export const MAX_GUEST_FILES = 20;
export const MAX_GUEST_TOTAL_BYTES = 50_000_000;

export function selectionLimitError(files: ReadonlyArray<{ size: number }>): string | undefined {
  if (files.length > MAX_GUEST_FILES) return `Se excedió el límite de ${MAX_GUEST_FILES} archivos seleccionados.`;
  if (files.some((file) => !Number.isSafeInteger(file.size) || file.size < 0)) return 'Un archivo tiene un tamaño inválido.';
  if (files.reduce((total, file) => total + file.size, 0) > MAX_GUEST_TOTAL_BYTES) {
    return `Se excedió el límite de ${MAX_GUEST_TOTAL_BYTES} bytes originales en la selección (50 MB).`;
  }
  return undefined;
}
