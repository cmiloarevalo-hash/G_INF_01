import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  LevelSuffix,
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
  alert: '9C2F2F',
  headerFill: 'D9EAF7',
  alternateFill: 'F3F8FC',
  text: '1F2937',
  muted: '5B6573',
  border: 'B8C7D9',
} as const;

const A4 = { width: 11906, height: 16838 };
const MARGINS = { top: 1304, right: 1417, bottom: 1304, left: 1417, header: 709, footer: 709 };

type Fact = NonNullable<TitleStudy['facts']>[number];
type Comparison = NonNullable<TitleStudy['comparisons']>[number];
type Entity = NonNullable<TitleStudy['entities']>[number];

const factCategoryLabels: Record<Fact['category'], string> = {
  DOCUMENT_IDENTITY: 'Identidad documental',
  PROPERTY_IDENTITY: 'Identificación del inmueble',
  REGISTRY_TITLE: 'Dominio e inscripciones',
  PARTY_RIGHT: 'Partes, titulares y derechos',
  PHYSICAL_PROPERTY: 'Descripción física y superficies',
  FISCAL_CADASTRAL: 'Antecedentes fiscales y catastrales',
  PLANNING_URBANISM: 'Planificación y condiciones urbanísticas',
  PERMIT_RECEPTION: 'Permisos, recepciones y regularizaciones',
  SUBDIVISION_PLAN: 'Subdivisión, loteo y planos',
  ENCUMBRANCE_RESTRICTION: 'Gravámenes, prohibiciones y restricciones',
  SUCCESSION: 'Sucesión y herencia',
  FINANCING_TRANSACTION: 'Financiamiento e hipotecas',
  REPRESENTATION_AUTHORITY: 'Personerías y poderes',
  TRANSACTION_PAYMENT: 'Actos, montos y pagos',
  OTHER: 'Otros antecedentes',
};

const comparisonLabels: Record<Comparison['result'], string> = {
  EXACT_MATCH: 'Coincidencia exacta',
  NORMALIZED_EQUIVALENT: 'Equivalente tras normalización',
  TEMPORAL_CHANGE: 'Cambio temporal',
  DIFFERENT_VALUE: 'Valor diferente',
  POSSIBLE_CONTRADICTION: 'Posible contradicción',
  AUTHORITY_SCOPE_DIFFERENCE: 'Diferencia de autoridad o alcance',
  PARTIAL_OVERLAP: 'Coincidencia parcial',
  STATUS_TRANSITION: 'Cambio de estado documentado',
};

const entityTypeLabels: Record<Entity['type'], string> = {
  PERSON: 'Persona',
  LEGAL_ENTITY: 'Persona jurídica',
  PROPERTY: 'Inmueble',
  RIGHT: 'Derecho',
  REGISTRATION: 'Inscripción',
  AUTHORITY: 'Autoridad',
  OTHER: 'Otra entidad',
};

export class InvalidTitleStudyReportError extends Error {
  constructor() {
    super('El reporte no cumple el contrato TITLE_STUDY.');
    this.name = 'InvalidTitleStudyReportError';
  }
}

function documentName(report: TitleStudy, documentId: string): string {
  return report.sourceDocuments.find((document) => document.id === documentId)?.name ?? documentId;
}

function factById(report: TitleStudy, factId: string): Fact | undefined {
  return report.facts?.find((fact) => fact.id === factId);
}

function entityLabel(report: TitleStudy, entityId: string): string {
  return report.entities?.find((entity) => entity.id === entityId)?.label ?? entityId;
}

type HeadingLevelValue = (typeof HeadingLevel)[keyof typeof HeadingLevel];

function heading(text: string, level: HeadingLevelValue): Paragraph {
  return new Paragraph({
    heading: level,
    keepNext: true,
    children: [new TextRun(text)],
  });
}

function body(text: string, options: { alert?: boolean } = {}): Paragraph {
  return new Paragraph({
    spacing: { after: 120, line: 276 },
    widowControl: true,
    children: [new TextRun({ text, color: options.alert ? COLORS.alert : COLORS.text })],
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

function sourceNames(report: TitleStudy, documentIds: string[]): string {
  return documentIds.map((id) => documentName(report, id)).join(' · ');
}

function sourceDocumentIdsFromFacts(report: TitleStudy, factIds: string[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const factId of factIds) {
    const fact = factById(report, factId);
    for (const documentId of fact?.sourceDocumentIds ?? []) {
      if (!seen.has(documentId)) {
        seen.add(documentId);
        ids.push(documentId);
      }
    }
  }
  return ids;
}

function sourceDocumentIdsFromFindings(report: TitleStudy, findingIds: string[]): string[] {
  const factIds = findingIds.flatMap(
    (findingId) => report.findings?.find((finding) => finding.id === findingId)?.supportingFactIds ?? [],
  );
  return sourceDocumentIdsFromFacts(report, factIds);
}

function locatorText(report: TitleStudy, fact: Fact): string {
  if (!fact.evidenceLocators?.length) return '';
  return fact.evidenceLocators
    .map((locator) => {
      const parts = [documentName(report, locator.documentId)];
      if (locator.page !== undefined) parts.push(`pág. ${locator.page}`);
      if (locator.section !== undefined) parts.push(locator.section);
      return parts.join(' · ');
    })
    .join(' | ');
}

function factTable(report: TitleStudy, facts: Fact[]): Table {
  const showNormalized = facts.some((fact) => fact.normalized !== undefined);
  const showLocator = facts.some((fact) => fact.evidenceLocators?.length);
  const headers = [
    'Hecho',
    'Valor original',
    ...(showNormalized ? ['Valor normalizado'] : []),
    'Fuente',
    ...(showLocator ? ['Referencia'] : []),
  ];

  const rows = facts.map((fact) => [
    fact.label,
    fact.original,
    ...(showNormalized ? [fact.normalized ?? ''] : []),
    sourceNames(report, fact.sourceDocumentIds),
    ...(showLocator ? [locatorText(report, fact)] : []),
  ]);

  return table(headers, rows);
}

function buildChildren(report: TitleStudy): Array<Paragraph | Table | TableOfContents> {
  const facts = report.facts ?? [];
  const entities = report.entities ?? [];
  const relationships = report.relationships ?? [];
  const comparisons = report.comparisons ?? [];
  const findings = report.findings ?? [];
  const risks = report.risksOrAlerts ?? [];
  const conclusions = report.conclusions ?? [];
  const timeline = report.timeline ?? [];

  const factLabels = new Map(facts.map((fact) => [fact.id, fact.label]));
  const findingLabels = new Map(findings.map((finding, index) => [finding.id, `Hallazgo ${index + 1}`]));
  const cachedEntries: Array<{ title: string; level: 1 | 2 }> = [];

  const reportHeading = (text: string, level: 1 | 2): Paragraph => {
    cachedEntries.push({ title: text, level });
    return heading(text, level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2);
  };

  const reportChildren: Array<Paragraph | Table> = [
    reportHeading('Objetivo del informe', 1),
    body(
      'Organizar los hechos contenidos en los documentos suministrados, conservar su trazabilidad y presentar comparaciones, hallazgos, riesgos y conclusiones preliminares para revisión humana.',
    ),
    reportHeading('Documentos fuente', 1),
  ];

  const showDocumentType = report.sourceDocuments.some((document) => document.documentType !== undefined);
  const showIssuer = report.sourceDocuments.some((document) => document.issuer !== undefined);
  const showIssueDate = report.sourceDocuments.some((document) => document.issueDate !== undefined);
  reportChildren.push(
    table(
      [
        'Documento',
        ...(showDocumentType ? ['Tipo documental'] : []),
        ...(showIssuer ? ['Emisor'] : []),
        ...(showIssueDate ? ['Fecha'] : []),
      ],
      report.sourceDocuments.map((document) => [
        document.name,
        ...(showDocumentType ? [document.documentType ?? 'Sin clasificar'] : []),
        ...(showIssuer ? [document.issuer ?? ''] : []),
        ...(showIssueDate ? [document.issueDate ?? ''] : []),
      ]),
    ),
  );

  if (facts.length > 0) {
    reportChildren.push(reportHeading('Antecedentes y hechos extraídos', 1));
    const grouped = new Map<Fact['category'], Fact[]>();
    facts.forEach((fact) => {
      const current = grouped.get(fact.category) ?? [];
      current.push(fact);
      grouped.set(fact.category, current);
    });
    grouped.forEach((categoryFacts, category) => {
      reportChildren.push(reportHeading(factCategoryLabels[category], 2));
      reportChildren.push(factTable(report, categoryFacts));
    });
  }

  if (entities.length > 0 || relationships.length > 0) {
    reportChildren.push(reportHeading('Entidades y relaciones documentadas', 1));
    if (entities.length > 0) {
      reportChildren.push(
        table(
          ['Entidad', 'Tipo', 'Fuentes'],
          entities.map((entity) => [
            entity.label,
            entityTypeLabels[entity.type],
            sourceNames(report, entity.sourceDocumentIds),
          ]),
        ),
      );
    }
    relationships.forEach((relationship) => {
      reportChildren.push(
        body(
          `${entityLabel(report, relationship.fromEntityId)} — ${relationship.statement} — ${entityLabel(report, relationship.toEntityId)}`,
        ),
      );
      reportChildren.push(mutedParagraph('Fuentes: ', sourceNames(report, relationship.sourceDocumentIds)));
    });
  }

  if (comparisons.length > 0) {
    reportChildren.push(reportHeading('Comparaciones y discrepancias', 1));
    comparisons.forEach((comparison, index) => {
      reportChildren.push(reportHeading(`Comparación ${index + 1}: ${comparison.topic}`, 2));
      reportChildren.push(mutedParagraph('Estado: ', comparisonLabels[comparison.result]));
      const comparisonFacts = comparison.factIds
        .map((id) => factById(report, id))
        .filter((fact): fact is Fact => fact !== undefined);
      if (comparisonFacts.length > 0) reportChildren.push(factTable(report, comparisonFacts));
      reportChildren.push(body(comparison.explanation));
      reportChildren.push(mutedParagraph('Fuentes: ', sourceNames(report, sourceDocumentIdsFromFacts(report, comparison.factIds))));
    });
  }

  if (findings.length > 0) {
    reportChildren.push(reportHeading('Hallazgos', 1));
    findings.forEach((finding, index) => {
      reportChildren.push(reportHeading(`Hallazgo ${index + 1}: ${finding.statement}`, 2));
      reportChildren.push(
        mutedParagraph(
          'Hechos de respaldo: ',
          finding.supportingFactIds.map((id) => factLabels.get(id) ?? id).join(' · '),
        ),
      );
      reportChildren.push(mutedParagraph('Fuentes: ', sourceNames(report, sourceDocumentIdsFromFacts(report, finding.supportingFactIds))));
    });
  }

  if (risks.length > 0) {
    reportChildren.push(reportHeading('Riesgos y alertas', 1));
    risks.forEach((risk, index) => {
      reportChildren.push(reportHeading(`Alerta ${index + 1}`, 2));
      reportChildren.push(body(risk.statement, { alert: true }));
      reportChildren.push(
        mutedParagraph(
          'Hechos de respaldo: ',
          risk.supportingFactIds.map((id) => factLabels.get(id) ?? id).join(' · '),
        ),
      );
      reportChildren.push(mutedParagraph('Fuentes: ', sourceNames(report, sourceDocumentIdsFromFacts(report, risk.supportingFactIds))));
    });
  }

  if (timeline.length > 0) {
    reportChildren.push(reportHeading('Cronología documental', 1));
    reportChildren.push(
      table(
        ['Fecha', 'Evento', 'Fuentes'],
        timeline.map((event) => [
          event.dateNormalized
            ? `${event.dateOriginal} (${event.dateNormalized})`
            : event.dateOriginal,
          event.event,
          sourceNames(report, sourceDocumentIdsFromFacts(report, event.supportingFactIds)),
        ]),
      ),
    );
  }

  if (conclusions.length > 0) {
    reportChildren.push(reportHeading('Conclusiones', 1));
    conclusions.forEach((conclusion) => {
      reportChildren.push(
        new Paragraph({
          numbering: { reference: 'conclusions', level: 0 },
          spacing: { after: 80, line: 276 },
          children: [new TextRun(conclusion.statement)],
        }),
      );
      reportChildren.push(
        mutedParagraph(
          'Hallazgos de respaldo: ',
          conclusion.supportingFindingIds.map((id) => findingLabels.get(id) ?? id).join(' · '),
        ),
      );
      reportChildren.push(mutedParagraph('Fuentes: ', sourceNames(report, sourceDocumentIdsFromFindings(report, conclusion.supportingFindingIds))));
    });
  }

  return [
    new Paragraph({
      spacing: { before: 3000, after: 240 },
      children: [new TextRun({ text: 'Estudio de Títulos', bold: true, size: 48, color: COLORS.primary })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: 'Análisis documental preliminar', size: 26, color: COLORS.secondary })],
    }),
    body('Documento generado para revisión humana. La salida estructurada no constituye validación jurídica.'),
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
    new TableOfContents('Índice', {
      hyperlink: true,
      headingStyleRange: '1-2',
      cachedEntries,
    }),
    new Paragraph({ children: [new PageBreak()] }),
    ...reportChildren,
  ];
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
              suffix: LevelSuffix.SPACE,
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
