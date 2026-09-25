import type { FC } from 'react';

export const HomePage: FC = () => {
  return (
    <div className="home-page">
      <div className="hero-card">
        <span className="hero-tag">Plataforma de Análisis Documental</span>
        <h2 className="hero-title">Análisis Documental Inmobiliario</h2>
        <p className="hero-desc">
          Aplicación web para la revisión sistemática de antecedentes inmobiliarios y asistencia en la generación de informes jurídicos. El primer tipo de informe objetivo corresponde al <strong>Estudio de Títulos</strong>.
        </p>
      </div>

      <div className="section-grid">
        <div className="info-card">
          <div className="info-card-header">
            <div className="info-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div className="info-card-title">Estudio de Títulos</div>
          </div>
          <p className="info-card-text">
            Análisis de escrituras públicas, títulos de dominio e inscripciones de gravámenes para verificar la vigencia de derechos y detectar eventuales contingencias o reparos jurídicos.
          </p>
        </div>

        <div className="info-card">
          <div className="info-card-header">
            <div className="info-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="info-card-title">Estructura por Proyectos</div>
          </div>
          <p className="info-card-text">
            Organización del trabajo por proyectos que integran antecedentes documentales, extracción estructurada validada con esquema y generación de informes exportables.
          </p>
        </div>

        <div className="info-card">
          <div className="info-card-header">
            <div className="info-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>
            <div className="info-card-title">Navegación del Sistema</div>
          </div>
          <p className="info-card-text">
            Acceso a través del menú lateral a las áreas principales del sistema: Proyectos, Informes, Modelos de IA, Documentos y Configuración.
          </p>
        </div>
      </div>

      <div className="notice-card">
        <div className="notice-card-header">
          <div className="notice-card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <div>
            <h3 className="notice-card-title">Disponibilidad en la versión inicial</h3>
            <p className="notice-card-desc">
              Esta versión establece la base de la aplicación y la estructura de navegación principal. Para preservar la transparencia y usabilidad, no se muestran formularios ficticios ni controles interactivos simulados: las áreas de gestión de proyectos, integración con almacenamiento, modelos de lenguaje y generación de informes se incorporarán progresivamente en sus correspondientes etapas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
