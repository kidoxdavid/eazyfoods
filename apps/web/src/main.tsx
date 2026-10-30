import { StrictMode } from 'react';
import { LiveProvider } from './live';
import { FeaturesProvider } from './features';
import { createRoot } from 'react-dom/client';
import { registerServiceWorker } from './pwa';
import { installAreaFetch } from './area';
import { LangProvider } from './i18n';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/unbounded/index.css';
import '@fontsource-variable/onest/index.css';
import { App } from './App';
import './styles.css';
import './store.css';
import './responsive.css';

installAreaFetch();
registerServiceWorker();
createRoot(document.getElementById('root')!).render(
  <StrictMode><LangProvider><FeaturesProvider><LiveProvider><BrowserRouter><App /></BrowserRouter></LiveProvider></FeaturesProvider></LangProvider></StrictMode>,
);
