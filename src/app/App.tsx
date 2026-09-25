import { useState, useEffect } from 'react';
import { Sidebar, NAV_ITEMS } from '../components/Sidebar.js';
import { Header } from '../components/Header.js';
import { HomePage } from '../pages/HomePage.js';
import { UnavailablePage } from '../pages/UnavailablePage.js';
import './App.css';

export function App() {
  const [currentSection, setCurrentSection] = useState<string>('inicio');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [isHealthOk, setIsHealthOk] = useState<boolean | null>(null);

  // Check health status for header badge
  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (res.ok) {
          setIsHealthOk(true);
        } else {
          setIsHealthOk(false);
        }
      })
      .catch(() => {
        setIsHealthOk(false);
      });
  }, []);

  const activeItem = NAV_ITEMS.find((item) => item.id === currentSection) || NAV_ITEMS[0];

  return (
    <div className="app-layout">
      <Sidebar
        currentSection={currentSection}
        onSelectSection={(id) => setCurrentSection(id)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <div className="main-content-wrapper">
        <Header
          currentSectionTitle={activeItem.label}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          isHealthOk={isHealthOk}
        />

        <main className="main-content">
          {currentSection === 'inicio' ? (
            <HomePage />
          ) : (
            <UnavailablePage
              sectionId={activeItem.id}
              sectionTitle={activeItem.label}
              onReturnToHome={() => setCurrentSection('inicio')}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
