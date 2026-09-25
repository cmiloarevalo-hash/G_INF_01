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
        Función no integrada
      </div>

      <h2 className="unavailable-title">{sectionTitle}</h2>

      <p className="unavailable-description">
        Esta sección corresponde a una capacidad prevista en la plataforma, pero <strong>no se encuentra integrada en esta versión inicial</strong>. Su habilitación se realizará en etapas posteriores de desarrollo.
      </p>

      <div className="unavailable-note">
        Para mantener la transparencia operativa y evitar confusión, en esta vista no se muestran formularios ficticios ni controles interactivos simulados.
      </div>

      <button type="button" className="btn-primary" onClick={onReturnToHome}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Volver al Inicio
      </button>
    </div>
  );
};
