import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './globals.css';
// Hydrate theme store early so the dark/light class is applied before first paint
import { useThemeStore } from './lib/store/theme-store';
useThemeStore.getState();
// Install the session-log wrappers BEFORE the React root is created so
// the fetch wrapper catches boot-time API calls and the ring captures
// the earliest possible events for a Send Feedback attachment.
import { installSessionLog } from './lib/api/session-log-init';
installSessionLog();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
