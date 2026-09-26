import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { titleStudySchema, type TitleStudy } from './schema.js';

export const TITLE_STUDY_DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const TITLE_STUDY_DOCX_FILENAME = 'estudio-de-titulos.docx';

const COLORS = {
  primary: '17365D',
  secondary: '2F75B5',
  headerFill: 'D9EAF7',
  alternateFill: 'F3F8FC',
  text: '1F2937',
  muted: '5B6573',
  border: 'B8C7D9',
} as const;

const A4 = { width: 11906, height: 16838 };
const MARGINS = { top: 1304, right: 1417, bottom: 1304, left: 1417, header: 709, footer: 709 };

const comparisonLabels = {
  CONSISTENT: 'Consistente',
  NORMALIZED_EQUIVALENT: 'Equivalente tras normalización',
  DIFFERENT: 'Diferente',
  POSSIBLE_CONTRADICTION: 'Posible contradicción',
  INSUFFICIENT_INFORMATION: 'Información insuficiente',
} as const;

type DocumentValue = NonNullable<NonNullable<TitleStudy['findings']>[number]['values']>[number];

export class InvalidTitleStudyReportError extends Error {
  constructor() {
    super('El reporte no cumple el contrato TITLE_STUDY.');
    this.name = 'InvalidTitleStudyReportError';
  }
}

function documentName(report: TitleStudy, documentId: string): string {
  return report.sourceDocuments.find((document) => document.id === documentId)?.name ?? documentId;
}

type HeadingLevelValue = (typeof HeadingLevel)[keyof typeof HeadingLevel];

function heading(text: string, level: HeadingLevelValue): Paragraph {
  return new Paragraph({
    heading: level,
    keepNext: true,
    children: [new TextRun(text)],
  });
}

function body(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120, line: 276 },
    widowControl: true,
    children: [new TextRun(text)],
  });
}

function mutedParagraph(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80, line: 276 },
    children: [
      new TextRun({ text: label, bold: true, color: COLORS.muted, size: 18 }),
      new TextRun({ text: value, color: COLORS.muted, size: 18 }),
    ],
  });
}

const border = { style: BorderStyle.SINGLE, size: 4, color: COLORS.border };

function cell(text: string, options: { header?: boolean; width?: number; alternate?: boolean } = {}): TableCell {
  return new TableCell({
    ...(options.width ? { width: { size: options.width, type: WidthType.PERCENTAGE } } : {}),
    shading: options.header
      ? { fill: COLORS.headerFill }
      : options.alternate
        ? { fill: COLORS.alternateFill }
        : undefined,
    margins: { top: 85, right: 113, bottom: 85, left: 113 },
    borders: { top: border, right: border, bottom: border, left: border },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            size: 19,
            color: options.header ? COLORS.primary : COLORS.text,
            bold: options.header,
          }),
        ],
      }),
    ],
  });
}

function table(headers: string[], rows: string[][]): Table {
  const width = Math.floor(100 / headers.length);
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((header) => cell(header, { header: true, width })),
      }),
      ...rows.map(
        (row, rowIndex) =>
          new TableRow({
            cantSplit: true,
            children: row.map((value) => cell(value, { width, alternate: rowIndex % 2 === 1 })),
          }),
      ),
    ],
  });
}

function valueRows(report: TitleStudy, values: DocumentValue[]): string[][] {
  const showNormalized = values.some((value) => value.normalized !== undefined);
  return values.map((value) => [
    documentName(report, value.documentId),
    value.field,
    value.original,
    ...(showNormalized ? [value.normalized ?? ''] : []),
  ]);
}

function valueTable(report: TitleStudy, values: DocumentValue[]): Table {
  const showNormalized = values.some((value) => value.normalized !== undefined);
  return table(
    ['Documento', 'Campo', 'Valor original', ...(showNormalized ? ['Valor normalizado'] : [])],
    valueRows(report, values),
  );
}

function buildChildren(report: TitleStudy): Array<Paragraph | Table | TableOfContents> {
  const findings = report.findings ?? [];
  const comparisons = report.comparisons ?? [];
  const conclusions = report.conclusions ?? [];
  const findingLabels = new Map(findings.map((finding, index) => [finding.id, `Hallazgo ${index + 1}`]));

  const children: Array<Paragraph | Table | TableOfContents> = [
    new Paragraph({
      spacing: { before: 3000, after: 240 },
      children: [new TextRun({ text: 'Estudio de Títulos', bold: true, size: 48, color: COLORS.primary })],
    }),
    new Paragraph({
      spacing: { after: 360 },
      children: [new TextRun({ text: 'Informe estructurado', size: 26, color: COLORS.secondary })],
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 16, color: COLORS.secondary } },
      spacing: { after: 240 },
      children: [new TextRun('')],
    }),
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      keepNext: true,
      spacing: { after: 180 },
      children: [new TextRun({ text: 'Índice', bold: true, size: 32, color: COLORS.primary })],
    }),
    new TableOfContents('Índice', { hyperlink: true, headingStyleRange: '1-2' }),
    new Paragraph({ children: [new PageBreak()] }),
    heading('Objetivo del informe', HeadingLevel.HEADING_1),
    new Paragraph({
      spacing: { after: 120, line: 276 },
      children: [
        new TextRun(
          'Presentar de forma estructurada y legible el resultado TITLE_STUDY validado y conservar su trazabilidad con los documentos fuente.',
        ),
      ],
    }),
    heading('Documentos fuente', HeadingLevel.HEADING_1),
    table(
      ['Documento', 'Tipo documental'],
      report.sourceDocuments.map((document) => [document.name, document.documentType]),
    ),
  ];

  if (findings.length > 0) {
    children.push(heading('Hallazgos', HeadingLevel.HEADING_1));
    findings.forEach((finding, index) => {
      children.push(heading(`Hallazgo ${index + 1}: ${finding.statement}`, HeadingLevel.HEADING_2));
      children.push(
        mutedParagraph(
          'Fuentes: ',
          finding.sourceDocumentIds.map((id) => documentName(report, id)).join(' · '),
        ),
      );
      if (finding.values?.length === 1) {
        const value = finding.values[0];
        children.push(
          body(`${documentName(report, value.documentId)} — ${value.field}: ${value.original}`),
        );
        if (value.normalized !== undefined) children.push(mutedParagraph('Valor normalizado: ', value.normalized));
      } else if (finding.values && finding.values.length > 1) {
        children.push(valueTable(report, finding.values));
      }
    });
  }

  if (comparisons.length > 0) {
    children.push(heading('Diferencias y comparaciones', HeadingLevel.HEADING_1));
    comparisons.forEach((comparison, index) => {
      children.push(heading(`Comparación ${index + 1}: ${comparison.field}`, HeadingLevel.HEADING_2));
      children.push(mutedParagraph('Estado: ', comparisonLabels[comparison.result]));
      children.push(valueTable(report, comparison.values));
      if (comparison.explanation !== undefined) {
        children.push(body(comparison.explanation));
      }
    });
  }

  if (conclusions.length > 0) {
    children.push(heading('Conclusiones', HeadingLevel.HEADING_1));
    conclusions.forEach((conclusion) => {
      children.push(
        new Paragraph({
          numbering: { reference: 'conclusions', level: 0 },
          spacing: { after: 80, line: 276 },
          children: [new TextRun(conclusion.statement)],
        }),
      );
      children.push(
        mutedParagraph(
          'Hallazgos de respaldo: ',
          conclusion.supportingFindingIds.map((id) => findingLabels.get(id) ?? id).join(' · '),
        ),
      );
    });
  }

  return children;
}

function buildDocument(report: TitleStudy): Document {
  return new Document({
    features: { updateFields: true },
    styles: {
      default: {
        document: {
          run: { font: 'Aptos', size: 22, color: COLORS.text },
          paragraph: { spacing: { after: 120, line: 276 } },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { font: 'Aptos', size: 32, bold: true, color: COLORS.primary },
          paragraph: { spacing: { before: 360, after: 160 }, keepNext: true, outlineLevel: 0 },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { font: 'Aptos', size: 26, bold: true, color: COLORS.secondary },
          paragraph: { spacing: { before: 280, after: 120 }, keepNext: true, outlineLevel: 1 },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { font: 'Aptos', size: 23, bold: true, color: COLORS.primary },
          paragraph: { spacing: { before: 200, after: 80 }, keepNext: true, outlineLevel: 2 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: 'conclusions',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 180 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          titlePage: true,
          page: {
            size: A4,
            margin: MARGINS,
            pageNumbers: { start: 1 },
          },
        },
        headers: {
          first: new Header({ children: [new Paragraph('')] }),
          default: new Header({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Estudio de Títulos', size: 18, color: COLORS.muted })],
              }),
            ],
          }),
        },
        footers: {
          first: new Footer({ children: [new Paragraph('')] }),
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    size: 18,
                    color: COLORS.muted,
                    children: ['Página ', PageNumber.CURRENT, ' de ', PageNumber.TOTAL_PAGES],
                  }),
                ],
              }),
            ],
          }),
        },
        children: buildChildren(report),
      },
    ],
  });
}

export async function renderTitleStudyDocx(input: unknown): Promise<Buffer> {
  const parsed = titleStudySchema.safeParse(input);
  if (!parsed.success) throw new InvalidTitleStudyReportError();
  return Packer.toBuffer(buildDocument(parsed.data));
}
