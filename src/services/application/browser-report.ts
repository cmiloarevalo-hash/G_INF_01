import { titleStudySchema } from '../../report-types/title-study/schema.js';
import type { ReportRenderer } from './authenticated-capabilities.js';

export function createBrowserTitleStudyReportRenderer(
  fetchImpl: typeof fetch = fetch,
): ReportRenderer {
  return async (analysis) => {
    const report = titleStudySchema.parse(analysis);
    const response = await fetchImpl('/api/guest/report-docx', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ report }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as
        | { error?: unknown }
        | null;
      throw new Error(
        typeof payload?.error === 'string'
          ? payload.error
          : `No fue posible generar el DOCX (HTTP ${response.status}).`,
      );
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )) {
      throw new Error('La respuesta no contiene un DOCX confirmado.');
    }

    return new Uint8Array(await response.arrayBuffer());
  };
}
