import { useState, useEffect, type FC } from 'react';

interface HealthData {
  status: string;
  uptime: number;
  timestamp: string;
}

interface HomePageProps {
  onNavigateToSection: (sectionId: string) => void;
}

export const HomePage: FC<HomePageProps> = ({ onNavigateToSection }) => {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoadingHealth(true);
    setHealthError(null);
    try {
      const res = await fetch('/api/health');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setHealthData(data);
    } catch (err: unknown) {
      setHealthError(err instanceof Error ? err.message : 'Error desconocido al consultar salud');
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="home-page">
      <div className="hero-card">
        <span className="hero-tag">Línea base ejecutable inicial · Work Item #1</span>
        <h2 className="hero-title">Análisis Documental Inmobiliario</h2>
        <p className="hero-desc">
          Aplicación web ligera de análisis documental asistido por LLM. El primer tipo de informe objetivo es el <strong>Estudio de Títulos</strong>, con extracción estructurada, validación rigurosa de esquema y renderizado DOCX profesional.
        </p>
      </div>

      <div className="status-box">
        <div className="status-box-header">
          <div className="status-box-title">Estado del Proceso HTTP (V-003, V-042, NFR-024)</div>
          <button
            type="button"
            className="btn-secondary"
            onClick={checkHealth}
            disabled={loadingHealth}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
            {loadingHealth ? 'Consultando...' : 'Revisar /api/health'}
          </button>
        </div>

        <div className="status-metrics">
          <div className="metric-item">
            <div className="metric-label">Endpoint</div>
            <div className="metric-value">GET /api/health</div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Respuesta HTTP</div>
            <div className="metric-value" style={{ color: healthError ? '#ef4444' : '#10b981' }}>
              {healthError ? healthError : healthData ? 'HTTP 200 OK' : 'Consultando...'}
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Estado del proceso</div>
            <div className="metric-value">
              {healthData?.status === 'ok' ? 'Activo (ok)' : 'En espera'}
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Tiempo activo (uptime)</div>
            <div className="metric-value">
              {healthData?.uptime ? `${Math.round(healthData.uptime)} s` : '-'}
            </div>
          </div>
        </div>

        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          * De conformidad con NFR-024 y V-042, <code>/api/health</code> representa únicamente la disponibilidad del proceso HTTP y no consulta ni afirma la disponibilidad de servicios externos (Drive, Firestore o proveedores LLM).
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
            Primer tipo de informe objetivo del producto (<code>TITLE_STUDY</code>). Permite analizar escrituras públicas, inscripciones de dominio, certificados de gravámenes y antecedentes inmobiliarios.
          </p>
        </div>

        <div className="info-card">
          <div className="info-card-header">
            <div className="info-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div className="info-card-title">Arquitectura Ligera</div>
          </div>
          <p className="info-card-text">
            Servidor Express 5 compilado con TypeScript, Vite integrado en desarrollo y servidor estático en producción. Sin sobreingeniería ni infraestructura prematura (NFR-001, NFR-002).
          </p>
        </div>

        <div className="info-card">
          <div className="info-card-header">
            <div className="info-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className="info-card-title">Disciplina de Alcance</div>
          </div>
          <p className="info-card-text">
            Este Work Item #1 establece estrictamente la primera aplicación ejecutable. Las funciones futuras de autenticación, Drive, proveedores LLM y DOCX se integrarán en sus respectivos Work Items.
          </p>
        </div>
      </div>

      <div className="info-card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-main)' }}>
          Estructura de Secciones según SRS §4 y Estado Actual
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
          {[
            { name: 'Inicio', id: 'inicio', status: 'INTEGRADA (ACTIVA)', isOk: true },
            { name: 'Proyectos: Nuevo proyecto', id: 'nuevo-proyecto', status: 'NO_INTEGRADA (FUTURA)', isOk: false },
            { name: 'Proyectos: Mis proyectos', id: 'mis-proyectos', status: 'NO_INTEGRADA (FUTURA)', isOk: false },
            { name: 'Informes: Mis informes', id: 'mis-informes', status: 'NO_INTEGRADA (FUTURA)', isOk: false },
            { name: 'IA: APIs y modelos', id: 'apis-modelos', status: 'NO_INTEGRADA (FUTURA)', isOk: false },
            { name: 'Documentos: Google Drive', id: 'google-drive', status: 'NO_INTEGRADA (FUTURA)', isOk: false },
            { name: 'Configuración', id: 'configuracion', status: 'NO_INTEGRADA (FUTURA)', isOk: false },
          ].map((sec) => (
            <div
              key={sec.id}
              onClick={() => onNavigateToSection(sec.id)}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>{sec.name}</span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  backgroundColor: sec.isOk ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: sec.isOk ? '#10b981' : '#fbbf24',
                  fontWeight: 600,
                }}
              >
                {sec.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
