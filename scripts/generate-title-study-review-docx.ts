import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { renderTitleStudyDocx } from '../src/report-types/title-study/renderer.js';
import { titleStudyReviewFixture } from '../tests/fixtures/title-study-review.js';

const outputPath = resolve('dist/review/title-study-review.docx');
const bytes = await renderTitleStudyDocx(titleStudyReviewFixture);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, bytes);

console.log(`${relative(process.cwd(), outputPath)} — ${bytes.length} bytes`);
