import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { getMissingRequiredEnvVars, logEnvDiagnostics } from './env/requiredEnv';
import { SetupErrorScreen } from './components/setup/SetupErrorScreen';
import { mountApp } from './appEntry';

const missing = getMissingRequiredEnvVars();
logEnvDiagnostics(missing);

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('#root element not found');
}

if (missing.length > 0) {
  createRoot(rootEl).render(
    <StrictMode>
      <SetupErrorScreen missingKeys={missing} />
    </StrictMode>
  );
} else {
  mountApp(rootEl);
}
