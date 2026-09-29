import { useState, useEffect } from 'react';
import { Sidebar, NAV_ITEMS } from '../components/Sidebar.js';
import { Header } from '../components/Header.js';
import { RoadmapStatusPanel } from '../components/RoadmapStatusPanel.js';
import { HomePage } from '../pages/HomePage.js';
import { GuestDocumentsPage } from '../pages/GuestDocumentsPage.js';
import { NewProjectPage } from '../pages/NewProjectPage.js';
import { ProjectsPage } from '../pages/ProjectsPage.js';
import { ProjectWorkspacePage } from '../pages/ProjectWorkspacePage.js';
import { ApisModelsPage } from '../pages/ApisModelsPage.js';
import { ReportsPage } from '../pages/ReportsPage.js';
import type { ProjectMetadata } from '../services/firestore/types.js';
import { UnavailablePage } from '../pages/UnavailablePage.js';
import './App.css';

export function App() {
  const [currentSection, setCurrentSection] = useState<string>('inicio');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [isHealthOk, setIsHealthOk] = useState<boolean | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectMetadata | null>(null);

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
  const currentTitle = currentSection === 'workspace-proyecto'
    ? selectedProject?.name ?? 'Proyecto'
    : activeItem.label;

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
          currentSectionTitle={currentTitle}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          isHealthOk={isHealthOk}
        />

        <main className="main-content">
          <div className={currentSection === 'inicio' ? 'main-content-grid' : 'main-content-grid main-content-grid-wide'}>
            <div className="main-content-primary">
              {currentSection === 'inicio' ? (
                <HomePage onOpenGuestDocuments={() => setCurrentSection('documentos-invitado')} />
              ) : currentSection === 'documentos-invitado' ? (
                <GuestDocumentsPage />
              ) : currentSection === 'nuevo-proyecto' ? (
                <NewProjectPage onCreated={(project) => {
                  setSelectedProject(project);
                  setCurrentSection('workspace-proyecto');
                }} />
              ) : currentSection === 'mis-proyectos' ? (
                <ProjectsPage onOpenProject={(project) => {
                  setSelectedProject(project);
                  setCurrentSection('workspace-proyecto');
                }} />
              ) : currentSection === 'mis-informes' ? (
                <ReportsPage />
              ) : currentSection === 'apis-modelos' ? (
                <ApisModelsPage />
              ) : currentSection === 'workspace-proyecto' && selectedProject ? (
                <ProjectWorkspacePage
                  initialProject={selectedProject}
                  onBack={() => setCurrentSection('mis-proyectos')}
                  onOpenApisModels={() => setCurrentSection('apis-modelos')}
                  onOpenReports={() => setCurrentSection('mis-informes')}
                />
              ) : (
                <UnavailablePage
                  sectionId={activeItem.id}
                  sectionTitle={activeItem.label}
                  onReturnToHome={() => setCurrentSection('inicio')}
                />
              )}
            </div>
            {currentSection === 'inicio' && <RoadmapStatusPanel />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
