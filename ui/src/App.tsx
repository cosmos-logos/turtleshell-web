import { Routes, Route, Navigate } from 'react-router-dom';
import { useStartupRefresh } from './hooks/useStartupRefresh';
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
import { AuthCallback } from './routes/AuthCallback';
import { ServiceDesk } from './routes/ServiceDesk';
import { History } from './routes/History';
import { Memory } from './routes/Memory';
import { Shells } from './routes/Shells';
import { Journal } from './routes/Journal';
import { AgentView } from './routes/AgentView';
import { OffGrid } from './routes/OffGrid';
import { Onboarding } from './routes/onboarding/Onboarding';
import { PublicProfile } from './routes/PublicProfile';
import { Profile } from './routes/Profile';
import { Login } from './routes/Login';
import { RequireAuth } from './components/auth/RequireAuth';

export function App() {
  useStartupRefresh();

  return (
    <Routes>
      {/* Public pages with marketing layout */}
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/offgrid" element={<OffGrid />} />
        {/* Public Learn — same content as /app/docs but mounted under
            the marketing layout so unauthenticated visitors can read
            the full guide. `basePath` prop keeps all internal
            BackLinks pointed at /learn instead of /app/docs. */}
        <Route path="/learn/*" element={<Docs basePath="/learn" />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/security" element={<Security />} />
      </Route>

      {/* Login (public) */}
      <Route path="/login" element={<Login />} />

      {/* Public profile (public) */}
      <Route path="/u/:username" element={<PublicProfile />} />

      {/* Auth callbacks (public) */}
      <Route path="/oauth/callback/:provider" element={<OAuthCallback />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Onboarding (requires auth) */}
      <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
      <Route path="/guide-selection" element={<Navigate to="/onboarding" replace />} />

      {/* App shell with sidebar (requires auth) */}
      <Route path="/app" element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route index element={<Navigate to="/app/chat" replace />} />
        <Route path="chat" element={<Chat />} />
        <Route path="history" element={<History />} />
        <Route path="memory" element={<Memory />} />
        <Route path="services" element={<Services />} />
        <Route path="service-desk" element={<ServiceDesk />} />
        <Route path="agents" element={<Agents />} />
        <Route path="journal" element={<Journal />} />
        <Route path="agent/:agentId" element={<AgentView />} />
        <Route path="shells" element={<Shells />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
        <Route path="docs/*" element={<Docs />} />
      </Route>

      {/* Catch-all goes to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
