import React, { type FC, type ReactNode } from 'react';
import type { TitleStudy } from '../report-types/title-study/schema.js';

// Keep a runtime React binding for the direct tsx test runner's JSX transform.
void React;

type Finding = NonNullable<TitleStudy['findings']>[number];
type Comparison = NonNullable<TitleStudy['comparisons']>[number];
type DocumentValue = NonNullable<Finding['values']>[number];

const comparisonLabels: Record<Comparison['result'], string> = {
  CONSISTENT: 'Consistente',
  NORMALIZED_EQUIVALENT: 'Equivalente tras normalización',
  DIFFERENT: 'Diferente',
  POSSIBLE_CONTRADICTION: 'Posible contradicción',
  INSUFFICIENT_INFORMATION: 'Información insuficiente',
};

export function comparisonLabel(result: Comparison['result']): string {
  return comparisonLabels[result];
}

export function resolveDocumentName(report: TitleStudy, documentId: string): string {
  return report.sourceDocuments.find((document) => document.id === documentId)?.name ?? documentId;
}

function ValueTable({ report, values }: { report: TitleStudy; values: DocumentValue[] }) {
  const showNormalized = values.some((value) => value.normalized !== undefined);

  return (
    <div className="title-study-table-scroll">
      <table className="title-study-table">
        <thead>
          <tr>
            <th scope="col">Documento</th>
            <th scope="col">Campo</th>
            <th scope="col">Valor original</th>
            {showNormalized && <th scope="col">Valor normalizado</th>}
          </tr>
        </thead>
        <tbody>
          {values.map((value, index) => (
            <tr key={`${value.documentId}-${value.field}-${index}`}>
              <td>{resolveDocumentName(report, value.documentId)}</td>
              <td>{value.field}</td>
              <td className="title-study-original-value">{value.original}</td>
              {showNormalized && <td>{value.normalized}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResultSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="title-study-section" id={id} aria-labelledby={`${id}-title`}>
      <h4 id={`${id}-title`}>{title}</h4>
      {children}
    </section>
  );
}

export const TitleStudyResult: FC<{ report: TitleStudy; partial: boolean }> = ({ report, partial }) => {
  const findings = report.findings ?? [];
  const comparisons = report.comparisons ?? [];
  const conclusions = report.conclusions ?? [];
  const findingLabels = new Map(findings.map((finding, index) => [finding.id, `Hallazgo ${index + 1}`]));

  const sections = [
    { id: 'title-study-sources', label: 'Documentos fuente', visible: true },
    { id: 'title-study-findings', label: 'Hallazgos', visible: findings.length > 0 },
    { id: 'title-study-comparisons', label: 'Comparaciones', visible: comparisons.length > 0 },
    { id: 'title-study-conclusions', label: 'Conclusiones', visible: conclusions.length > 0 },
  ].filter((section) => section.visible);

  return (
    <section className="guest-report-panel title-study-result" aria-labelledby="guest-report-title">
      <header className="title-study-result-header">
        <span className="hero-tag">Estudio de Títulos</span>
        <h3 id="guest-report-title">Resultado preliminar {partial ? '(parcial)' : ''}</h3>
        <p className="title-study-review-note">
          Requiere revisión humana. Esta presentación organiza el resultado validado y no constituye una validación jurídica.
        </p>
      </header>

      <nav className="title-study-result-nav" aria-label="Secciones del resultado">
        {sections.map((section) => (
          <a href={`#${section.id}`} key={section.id}>{section.label}</a>
        ))}
      </nav>

      <ResultSection id="title-study-sources" title="Documentos fuente">
        <div className="title-study-table-scroll">
          <table className="title-study-table">
            <thead>
              <tr>
                <th scope="col">Documento</th>
                <th scope="col">Tipo documental</th>
              </tr>
            </thead>
            <tbody>
              {report.sourceDocuments.map((document, index) => (
                <tr id={`title-study-source-${index + 1}`} key={document.id}>
                  <td>{document.name}</td>
                  <td>{document.documentType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ResultSection>

      {findings.length > 0 && (
        <ResultSection id="title-study-findings" title="Hallazgos">
          <div className="title-study-card-list">
            {findings.map((finding, index) => (
              <article className="title-study-card" id={`title-study-finding-${index + 1}`} key={finding.id}>
                <div className="title-study-card-heading">
                  <span className="title-study-index">Hallazgo {index + 1}</span>
                  <h5>{finding.statement}</h5>
                </div>
                <p className="title-study-trace">
                  <strong>Fuentes:</strong>{' '}
                  {finding.sourceDocumentIds.map((documentId) => resolveDocumentName(report, documentId)).join(' · ')}
                </p>
                {finding.values && finding.values.length > 0 && <ValueTable report={report} values={finding.values} />}
              </article>
            ))}
          </div>
        </ResultSection>
      )}

      {comparisons.length > 0 && (
        <ResultSection id="title-study-comparisons" title="Comparaciones y diferencias">
          <div className="title-study-card-list">
            {comparisons.map((comparison, index) => (
              <article className="title-study-card" key={comparison.id}>
                <div className="title-study-comparison-heading">
                  <div>
                    <span className="title-study-index">Comparación {index + 1}</span>
                    <h5>{comparison.field}</h5>
                  </div>
                  <span className="title-study-comparison-status">{comparisonLabel(comparison.result)}</span>
                </div>
                <ValueTable report={report} values={comparison.values} />
                {comparison.explanation && <p className="title-study-explanation">{comparison.explanation}</p>}
              </article>
            ))}
          </div>
        </ResultSection>
      )}

      {conclusions.length > 0 && (
        <ResultSection id="title-study-conclusions" title="Conclusiones">
          <ol className="title-study-conclusion-list">
            {conclusions.map((conclusion) => (
              <li key={conclusion.id}>
                <p>{conclusion.statement}</p>
                <p className="title-study-trace">
                  <strong>Hallazgos de respaldo:</strong>{' '}
                  {conclusion.supportingFindingIds.map((findingId) => findingLabels.get(findingId) ?? findingId).join(' · ')}
                </p>
              </li>
            ))}
          </ol>
        </ResultSection>
      )}
    </section>
  );
};
