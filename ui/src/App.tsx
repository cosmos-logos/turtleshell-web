import { Routes, Route, Navigate } from 'react-router-dom';
import { MarketingLayout } from './components/layout/MarketingLayout';
import { AppShell } from './components/layout/AppShell';
import { Landing } from './routes/Landing';
import { Terms } from './routes/Terms';
import { Privacy } from './routes/Privacy';
import { Security } from './routes/Security';
import { Chat } from './routes/Chat';
import { Services } from './routes/Services';
import { Agents } from './routes/Agents';
import { Settings } from './routes/Settings';
import { Docs } from './routes/Docs';
import { OAuthCallback } from './routes/OAuthCallback';

export function App() {
  return (
    <Routes>
      {/* Public pages with marketing layout */}
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/security" element={<Security />} />
      </Route>

      {/* OAuth callback (outside shell) */}
      <Route path="/oauth/callback/:provider" element={<OAuthCallback />} />

      {/* App shell with sidebar */}
      <Route path="/app" element={<AppShell />}>
        <Route index element={<Navigate to="/app/chat" replace />} />
        <Route path="chat" element={<Chat />} />
        <Route path="services" element={<Services />} />
        <Route path="agents" element={<Agents />} />
        <Route path="settings" element={<Settings />} />
        <Route path="docs/*" element={<Docs />} />
      </Route>

      {/* Catch-all goes to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
