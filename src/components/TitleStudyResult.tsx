import React, { type FC, type ReactNode } from 'react';
import type { TitleStudy } from '../report-types/title-study/schema.js';

void React;

type Fact = NonNullable<TitleStudy['facts']>[number];
type Comparison = NonNullable<TitleStudy['comparisons']>[number];

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

export function comparisonLabel(result: Comparison['result']): string {
  return comparisonLabels[result];
}

export function resolveDocumentName(report: TitleStudy, documentId: string): string {
  return report.sourceDocuments.find((document) => document.id === documentId)?.name ?? documentId;
}

function ResultSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="title-study-section" id={id} aria-labelledby={`${id}-title`}>
      <h4 id={`${id}-title`}>{title}</h4>
      {children}
    </section>
  );
}

function sourceNames(report: TitleStudy, ids: string[]) {
  return ids.map((id) => resolveDocumentName(report, id)).join(' · ');
}

function FactTable({ report, facts }: { report: TitleStudy; facts: Fact[] }) {
  const showNormalized = facts.some((fact) => fact.normalized !== undefined);
  const showLocator = facts.some((fact) => fact.evidenceLocators?.length);
  return (
    <div className="title-study-table-scroll">
      <table className="title-study-table">
        <thead><tr>
          <th>Hecho</th><th>Valor original</th>
          {showNormalized && <th>Valor normalizado</th>}
          <th>Fuente</th>{showLocator && <th>Referencia</th>}
        </tr></thead>
        <tbody>{facts.map((fact) => <tr key={fact.id}>
          <td>{fact.label}</td>
          <td className="title-study-original-value">{fact.original}</td>
          {showNormalized && <td>{fact.normalized ?? ''}</td>}
          <td>{sourceNames(report, fact.sourceDocumentIds)}</td>
          {showLocator && <td>{fact.evidenceLocators?.map((locator) => [
            resolveDocumentName(report, locator.documentId),
            locator.page ? `pág. ${locator.page}` : '',
            locator.section ?? '',
          ].filter(Boolean).join(' · ')).join(' | ') ?? ''}</td>}
        </tr>)}</tbody>
      </table>
    </div>
  );
}

export const TitleStudyResult: FC<{ report: TitleStudy; partial: boolean }> = ({ report, partial }) => {
  const facts = report.facts ?? [];
  const comparisons = report.comparisons ?? [];
  const findings = report.findings ?? [];
  const risks = report.risksOrAlerts ?? [];
  const conclusions = report.conclusions ?? [];
  const timeline = report.timeline ?? [];
  const entities = report.entities ?? [];
  const relationships = report.relationships ?? [];
  const factLabels = new Map(facts.map((fact) => [fact.id, fact.label]));
  const findingLabels = new Map(findings.map((finding, index) => [finding.id, `Hallazgo ${index + 1}`]));
  const entityLabels = new Map(entities.map((entity) => [entity.id, entity.label]));

  const groupedFacts = new Map<Fact['category'], Fact[]>();
  facts.forEach((fact) => groupedFacts.set(fact.category, [...(groupedFacts.get(fact.category) ?? []), fact]));

  const sections = [
    { id: 'title-study-sources', label: 'Documentos fuente', visible: true },
    { id: 'title-study-facts', label: 'Hechos', visible: facts.length > 0 },
    { id: 'title-study-entities', label: 'Entidades', visible: entities.length > 0 || relationships.length > 0 },
    { id: 'title-study-comparisons', label: 'Comparaciones', visible: comparisons.length > 0 },
    { id: 'title-study-findings', label: 'Hallazgos', visible: findings.length > 0 },
    { id: 'title-study-risks', label: 'Riesgos y alertas', visible: risks.length > 0 },
    { id: 'title-study-timeline', label: 'Cronología', visible: timeline.length > 0 },
    { id: 'title-study-conclusions', label: 'Conclusiones', visible: conclusions.length > 0 },
  ].filter((section) => section.visible);

  return (
    <section className="guest-report-panel title-study-result" aria-labelledby="guest-report-title">
      <header className="title-study-result-header">
        <span className="hero-tag">Estudio de Títulos</span>
        <h3 id="guest-report-title">Resultado preliminar {partial ? '(parcial)' : ''}</h3>
        <p className="title-study-review-note">
          Requiere revisión humana. Esta presentación organiza evidencia documental validada y no constituye una validación jurídica.
        </p>
      </header>

      <nav className="title-study-result-nav" aria-label="Secciones del resultado">
        {sections.map((section) => <a href={`#${section.id}`} key={section.id}>{section.label}</a>)}
      </nav>

      <ResultSection id="title-study-sources" title="Documentos fuente">
        <div className="title-study-table-scroll"><table className="title-study-table">
          <thead><tr>
            <th>Documento</th><th>Tipo documental</th>
            {report.sourceDocuments.some((document) => document.issuer !== undefined) && <th>Emisor</th>}
            {report.sourceDocuments.some((document) => document.issueDate !== undefined) && <th>Fecha</th>}
          </tr></thead>
          <tbody>{report.sourceDocuments.map((document) => <tr key={document.id}>
            <td>{document.name}</td><td>{document.documentType}</td>
            {report.sourceDocuments.some((item) => item.issuer !== undefined) && <td>{document.issuer ?? ''}</td>}
            {report.sourceDocuments.some((item) => item.issueDate !== undefined) && <td>{document.issueDate ?? ''}</td>}
          </tr>)}</tbody>
        </table></div>
      </ResultSection>

      {facts.length > 0 && <ResultSection id="title-study-facts" title="Antecedentes y hechos extraídos">
        {[...groupedFacts.entries()].map(([category, categoryFacts]) => <article className="title-study-card" key={category}>
          <div className="title-study-card-heading"><h5>{factCategoryLabels[category]}</h5></div>
          <FactTable report={report} facts={categoryFacts} />
        </article>)}
      </ResultSection>}

      {(entities.length > 0 || relationships.length > 0) && <ResultSection id="title-study-entities" title="Entidades y relaciones documentadas">
        {entities.length > 0 && <ul>{entities.map((entity) => <li key={entity.id}>
          <strong>{entity.label}</strong> · {entity.type} · {sourceNames(report, entity.sourceDocumentIds)}
        </li>)}</ul>}
        {relationships.map((relationship) => <article className="title-study-card" key={relationship.id}>
          <p>{entityLabels.get(relationship.fromEntityId) ?? relationship.fromEntityId} — {relationship.statement} — {entityLabels.get(relationship.toEntityId) ?? relationship.toEntityId}</p>
          <p className="title-study-trace"><strong>Fuentes:</strong> {sourceNames(report, relationship.sourceDocumentIds)}</p>
        </article>)}
      </ResultSection>}

      {comparisons.length > 0 && <ResultSection id="title-study-comparisons" title="Comparaciones y discrepancias">
        <div className="title-study-card-list">{comparisons.map((comparison, index) => {
          const comparisonFacts = comparison.factIds.map((id) => facts.find((fact) => fact.id === id)).filter((fact): fact is Fact => Boolean(fact));
          return <article className="title-study-card" key={comparison.id}>
            <div className="title-study-comparison-heading"><div><span className="title-study-index">Comparación {index + 1}</span><h5>{comparison.topic}</h5></div>
              <span className="title-study-comparison-status">{comparisonLabel(comparison.result)}</span></div>
            <FactTable report={report} facts={comparisonFacts} />
            <p className="title-study-explanation">{comparison.explanation}</p>
            <p className="title-study-trace"><strong>Fuentes:</strong> {sourceNames(report, comparison.sourceDocumentIds)}</p>
          </article>;
        })}</div>
      </ResultSection>}

      {findings.length > 0 && <ResultSection id="title-study-findings" title="Hallazgos">
        <div className="title-study-card-list">{findings.map((finding, index) => <article className="title-study-card" key={finding.id}>
          <span className="title-study-index">Hallazgo {index + 1}</span><h5>{finding.statement}</h5>
          <p className="title-study-trace"><strong>Hechos de respaldo:</strong> {finding.supportingFactIds.map((id) => factLabels.get(id) ?? id).join(' · ')}</p>
          <p className="title-study-trace"><strong>Fuentes:</strong> {sourceNames(report, finding.sourceDocumentIds)}</p>
        </article>)}</div>
      </ResultSection>}

      {risks.length > 0 && <ResultSection id="title-study-risks" title="Riesgos y alertas">
        <div className="title-study-card-list">{risks.map((risk, index) => <article className="title-study-card" key={risk.id}>
          <span className="title-study-index">Alerta {index + 1}</span><h5>{risk.statement}</h5>
          <p className="title-study-trace"><strong>Hechos de respaldo:</strong> {risk.supportingFactIds.map((id) => factLabels.get(id) ?? id).join(' · ')}</p>
          <p className="title-study-trace"><strong>Fuentes:</strong> {sourceNames(report, risk.sourceDocumentIds)}</p>
        </article>)}</div>
      </ResultSection>}

      {timeline.length > 0 && <ResultSection id="title-study-timeline" title="Cronología documental">
        <div className="title-study-table-scroll"><table className="title-study-table"><thead><tr><th>Fecha</th><th>Evento</th><th>Fuentes</th></tr></thead>
          <tbody>{timeline.map((event) => <tr key={event.id}><td>{event.dateOriginal}{event.dateNormalized ? ` (${event.dateNormalized})` : ''}</td><td>{event.event}</td><td>{sourceNames(report, event.sourceDocumentIds)}</td></tr>)}</tbody>
        </table></div>
      </ResultSection>}

      {conclusions.length > 0 && <ResultSection id="title-study-conclusions" title="Conclusiones">
        <ol className="title-study-conclusion-list">{conclusions.map((conclusion) => <li key={conclusion.id}>
          <p>{conclusion.statement}</p>
          <p className="title-study-trace"><strong>Hallazgos de respaldo:</strong> {conclusion.supportingFindingIds.map((id) => findingLabels.get(id) ?? id).join(' · ')}</p>
          <p className="title-study-trace"><strong>Fuentes:</strong> {sourceNames(report, conclusion.sourceDocumentIds)}</p>
        </li>)}</ol>
      </ResultSection>}
    </section>
  );
};
