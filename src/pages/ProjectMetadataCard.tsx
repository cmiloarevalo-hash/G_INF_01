import type { ProjectMetadata } from '../services/firestore/types.js';

export function ProjectMetadataCard({ project }: { project: ProjectMetadata }) {
  const created = project.createdAt?.toLocaleString();
  const updated = project.updatedAt?.toLocaleString();

  return (
    <article className="project-metadata-card" data-project-id={project.id}>
      <div className="project-metadata-heading">
        <h3>{project.name}</h3>
        <code>{project.id}</code>
      </div>
      {(created || updated) && (
        <dl className="project-metadata-dates">
          {created && (
            <>
              <dt>Creado</dt>
              <dd>{created}</dd>
            </>
          )}
          {updated && (
            <>
              <dt>Actualizado</dt>
              <dd>{updated}</dd>
            </>
          )}
        </dl>
      )}
    </article>
  );
}
