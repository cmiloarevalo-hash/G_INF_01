import type { FC } from 'react';

interface HeaderProps {
  currentSectionTitle: string;
  onOpenMobileMenu: () => void;
  isHealthOk: boolean | null;
}

export const Header: FC<HeaderProps> = ({
  currentSectionTitle,
  onOpenMobileMenu,
  isHealthOk,
}) => {
  return (
    <header className="top-header">
      <div className="header-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onOpenMobileMenu}
          aria-label="Abrir navegación"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 className="header-title">{currentSectionTitle}</h1>
      </div>

      <div className="header-badge">
        <span className="status-dot" style={{ backgroundColor: isHealthOk ? '#10b981' : '#f59e0b' }} />
        <span>{isHealthOk ? 'Servidor HTTP activo' : 'Verificando salud'}</span>
      </div>
    </header>
  );
};
