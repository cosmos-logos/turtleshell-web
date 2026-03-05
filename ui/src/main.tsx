import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './globals.css';
// Hydrate theme store early so the dark/light class is applied before first paint
import { useThemeStore } from './lib/store/theme-store';
useThemeStore.getState();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
