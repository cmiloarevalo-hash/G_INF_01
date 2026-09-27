import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { AuthSessionProvider } from '../services/auth/context.js';
import { App } from './App.js';

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <AuthSessionProvider>
        <App />
      </AuthSessionProvider>
    </StrictMode>
  );
}
