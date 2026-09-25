import type { FC } from 'react';

interface UnavailablePageProps {
  sectionId: string;
  sectionTitle: string;
  onReturnToHome: () => void;
}

export const UnavailablePage: FC<UnavailablePageProps> = ({
  sectionTitle,
  onReturnToHome,
}) => {
  return (
    <div className="unavailable-container">
      <div className="unavailable-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        Función No Disponible · Work Item #1
      </div>

      <h2 className="unavailable-title">{sectionTitle}</h2>

      <p className="unavailable-description">
        Esta sección pertenece a los módulos previstos en la arquitectura (SRS §4), pero <strong>no se encuentra integrada en esta versión inicial</strong>. Su desarrollo se realizará en posteriores Work Items conforme al plan de trabajo.
      </p>

      <div className="unavailable-note">
        <strong>Cumplimiento de UIR-008:</strong> De acuerdo con los requisitos canónicos de interfaz, no se presentan controles, botones ficticios ni datos simulados que aparenten operar. Las capacidades aún no implementadas se declaran explícitamente como no disponibles.
      </div>

      <button type="button" className="btn-primary" onClick={onReturnToHome}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Volver a la vista Inicio
      </button>
    </div>
  );
};
