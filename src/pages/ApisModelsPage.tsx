import * as React from 'react';
import { useAuthSession } from '../services/auth/context.js';
import {
  SUPPORTED_AI_MODEL,
  SUPPORTED_AI_PROVIDER,
} from '../services/ai/preferences.js';
import { useProductRuntime } from '../services/application/product-runtime.js';

export function ApisModelsPage() {
  const { session } = useAuthSession();
  const runtime = useProductRuntime();
  const [credentialInput, setCredentialInput] = React.useState('');
  const [credentialLoaded, setCredentialLoaded] = React.useState(false);
  const [instruction, setInstruction] = React.useState('');
  const [preferenceStatus, setPreferenceStatus] = React.useState<
    'idle' | 'loading' | 'saved' | 'error'
  >('idle');
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (runtime.status !== 'available' || session.status !== 'authenticated') {
      return;
    }
    let active = true;
    setPreferenceStatus('loading');
    void runtime.services.aiPreferences.get(session)
      .then(() => {
        if (!active) return;
        setPreferenceStatus('idle');
        setCredentialLoaded(Boolean(runtime.services.aiCredentials.get()));
        setInstruction(runtime.services.aiInstruction.get());
      })
      .catch((error) => {
        if (!active) return;
        setPreferenceStatus('error');
        setMessage(
          error instanceof Error
            ? error.message
            : 'No fue posible leer la preferencia AI.',
        );
      });
    return () => {
      active = false;
    };
  }, [runtime, session]);

  if (session.status !== 'authenticated') {
    return (
      <div className="project-state-card">
        Inicia sesión con Google para configurar APIs y modelos persistentes.
      </div>
    );
  }
  if (runtime.status === 'checking') {
    return <div className="project-state-card">Preparando configuración AI…</div>;
  }
  if (runtime.status === 'unavailable') {
    return (
      <div className="project-state-card">
        <strong>Configuración AI no disponible.</strong>
        <span>{runtime.reason}</span>
      </div>
    );
  }

  const services = runtime.services;

  const savePreference = async () => {
    setPreferenceStatus('loading');
    setMessage(null);
    try {
      await services.aiPreferences.set(session, {
        provider: SUPPORTED_AI_PROVIDER,
        model: SUPPORTED_AI_MODEL,
      });
      setPreferenceStatus('saved');
      setMessage('Preferencia no sensible guardada en Firestore.');
    } catch (error) {
      setPreferenceStatus('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'No fue posible guardar la preferencia AI.',
      );
    }
  };

  const useCredential = () => {
    try {
      services.aiCredentials.set(credentialInput);
      setCredentialInput('');
      setCredentialLoaded(true);
      setMessage('Clave API cargada sólo en memoria para esta sesión.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No fue posible cargar la credencial.',
      );
    }
  };

  const clearCredential = () => {
    services.aiCredentials.clear();
    setCredentialInput('');
    setCredentialLoaded(false);
    setMessage('Clave API eliminada de la memoria de sesión.');
  };

  const saveInstruction = () => {
    services.aiInstruction.set(instruction);
    setInstruction(services.aiInstruction.get());
    setMessage(
      services.aiInstruction.get()
        ? 'Instrucción adicional guardada sólo en memoria de sesión.'
        : 'Instrucción adicional vacía.',
    );
  };

  return (
    <section className="project-page" aria-labelledby="apis-models-title">
      <div className="project-page-heading">
        <span className="hero-tag">M4.5c</span>
        <h2 id="apis-models-title">APIs y modelos</h2>
        <p>
          Sólo se muestran proveedor y modelo realmente implementados.
          La credencial nunca se persiste en Firestore, Drive ni almacenamiento
          del navegador.
        </p>
      </div>

      <div className="workspace-panel">
        <h3>Proveedor y modelo</h3>
        <label htmlFor="ai-provider">Proveedor</label>
        <select id="ai-provider" className="guest-api-key" value={SUPPORTED_AI_PROVIDER} disabled>
          <option value={SUPPORTED_AI_PROVIDER}>Google Gemini</option>
        </select>

        <label htmlFor="ai-model">Modelo</label>
        <select id="ai-model" className="guest-api-key" value={SUPPORTED_AI_MODEL} disabled>
          <option value={SUPPORTED_AI_MODEL}>{SUPPORTED_AI_MODEL}</option>
        </select>

        <button
          type="button"
          className="btn-secondary"
          disabled={preferenceStatus === 'loading'}
          onClick={() => void savePreference()}
        >
          {preferenceStatus === 'loading'
            ? 'Guardando…'
            : 'Guardar preferencia'}
        </button>
      </div>

      <div className="workspace-panel">
        <h3>Credencial API de sesión</h3>
        <p>
          Estado: <strong>{credentialLoaded ? 'cargada en memoria' : 'no cargada'}</strong>.
        </p>
        <label htmlFor="authenticated-api-key">Clave Gemini</label>
        <input
          id="authenticated-api-key"
          className="guest-api-key"
          type="password"
          autoComplete="off"
          value={credentialInput}
          onChange={(event) => setCredentialInput(event.target.value)}
        />
        <div className="workspace-actions">
          <button
            type="button"
            className="btn-primary"
            disabled={!credentialInput.trim()}
            onClick={useCredential}
          >
            Usar durante esta sesión
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={!credentialLoaded}
            onClick={clearCredential}
          >
            Eliminar clave de memoria
          </button>
        </div>
      </div>

      <div className="workspace-panel">
        <h3>Instrucción adicional</h3>
        <label htmlFor="additional-instruction">
          Instrucción que complementa el prompt base
        </label>
        <textarea
          id="additional-instruction"
          className="guest-api-key workspace-textarea"
          value={instruction}
          maxLength={4000}
          onChange={(event) => setInstruction(event.target.value)}
        />
        <button type="button" className="btn-secondary" onClick={saveInstruction}>
          Aplicar a la sesión
        </button>
      </div>

      {message && (
        <div
          className={preferenceStatus === 'error' ? 'project-error' : 'project-state-card'}
          role={preferenceStatus === 'error' ? 'alert' : 'status'}
        >
          {message}
        </div>
      )}
    </section>
  );
}
