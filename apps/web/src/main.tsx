import { StrictMode } from 'react';
import { FeaturesProvider } from './features';
import { createRoot } from 'react-dom/client';
import { registerServiceWorker } from './pwa';
import { LangProvider } from './i18n';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/unbounded/index.css';
import '@fontsource-variable/onest/index.css';
import { App } from './App';
import './styles.css';
import './store.css';

registerServiceWorker();
createRoot(document.getElementById('root')!).render(
  <StrictMode><LangProvider><FeaturesProvider><BrowserRouter><App /></BrowserRouter></FeaturesProvider></LangProvider></StrictMode>,
);
