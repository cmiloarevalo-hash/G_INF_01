import type { FC } from 'react';

export interface NavItemConfig {
  id: string;
  label: string;
  group: string;
  isAvailable: boolean;
}

export const NAV_ITEMS: NavItemConfig[] = [
  { id: 'inicio', label: 'Inicio', group: 'Principal', isAvailable: true },
  { id: 'nuevo-proyecto', label: 'Nuevo proyecto', group: 'Proyectos', isAvailable: false },
  { id: 'mis-proyectos', label: 'Mis proyectos', group: 'Proyectos', isAvailable: false },
  { id: 'mis-informes', label: 'Mis informes', group: 'Informes', isAvailable: false },
  { id: 'apis-modelos', label: 'APIs y modelos', group: 'IA', isAvailable: false },
  { id: 'google-drive', label: 'Google Drive', group: 'Documentos', isAvailable: false },
  { id: 'configuracion', label: 'Configuración', group: 'Configuración', isAvailable: false },
];

interface SidebarProps {
  currentSection: string;
  onSelectSection: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

function renderIcon(id: string) {
  switch (id) {
    case 'inicio':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'nuevo-proyecto':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'mis-proyectos':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'mis-informes':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case 'apis-modelos':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <line x1="9" y1="1" x2="9" y2="4" />
          <line x1="15" y1="1" x2="15" y2="4" />
          <line x1="9" y1="20" x2="9" y2="23" />
          <line x1="15" y1="20" x2="15" y2="23" />
          <line x1="20" y1="9" x2="23" y2="9" />
          <line x1="20" y1="14" x2="23" y2="14" />
          <line x1="1" y1="9" x2="4" y2="9" />
          <line x1="1" y1="14" x2="4" y2="14" />
        </svg>
      );
    case 'google-drive':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      );
    case 'configuracion':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    default:
      return null;
  }
}

export const Sidebar: FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  // Group navigation items by group
  const groups: { [key: string]: NavItemConfig[] } = {};
  for (const item of NAV_ITEMS) {
    if (!groups[item.group]) {
      groups[item.group] = [];
    }
    groups[item.group].push(item);
  }

  const handleItemClick = (id: string) => {
    onSelectSection(id);
    onCloseMobile();
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={onCloseMobile}
          aria-label="Cerrar navegación lateral"
        />
      )}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          {!isCollapsed && (
            <div className="brand-wrapper">
              <div className="brand-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 21h18" />
                  <path d="M5 21V7l8-4v18" />
                  <path d="M19 21V11l-6-4" />
                </svg>
              </div>
              <div>
                <div className="brand-text">Análisis Documental</div>
                <div className="brand-subtext">Estudio de Títulos</div>
              </div>
            </div>
          )}

          <button
            type="button"
            className="collapse-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expandir barra lateral' : 'Plegar barra lateral'}
            aria-label={isCollapsed ? 'Expandir barra lateral' : 'Plegar barra lateral'}
          >
            {isCollapsed ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            )}
          </button>
        </div>

        <nav className="sidebar-nav">
          {Object.entries(groups).map(([groupName, items]) => (
            <div key={groupName} className="nav-group">
              {!isCollapsed && groupName !== 'Principal' && (
                <div className="nav-group-title">{groupName}</div>
              )}
              {items.map((item) => {
                const isActive = currentSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleItemClick(item.id)}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <span className="nav-icon">{renderIcon(item.id)}</span>
                    {!isCollapsed && (
                      <>
                        <span className="nav-label">{item.label}</span>
                        {!item.isAvailable && (
                          <span className="nav-tag" title="Función no disponible en esta versión">
                            Próx.
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          {!isCollapsed && <div>Línea base v0.1.0 · Issue #1</div>}
        </div>
      </aside>
    </>
  );
};
