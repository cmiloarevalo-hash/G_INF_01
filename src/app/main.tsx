import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { AuthSessionProvider } from '../services/auth/context.js';
import { ProjectRuntimeProvider } from '../services/firestore/runtime.js';
import { ProductRuntimeProvider } from '../services/application/product-runtime.js';
import { App } from './App.js';

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <AuthSessionProvider>
        <ProjectRuntimeProvider>
          <ProductRuntimeProvider>
            <App />
          </ProductRuntimeProvider>
        </ProjectRuntimeProvider>
      </AuthSessionProvider>
    </StrictMode>
  );
}
