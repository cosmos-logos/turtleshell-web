import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { logSession } from '@/lib/api/session-log';

/**
 * Logs every react-router navigation into the session-log ring. Mount
 * once inside <BrowserRouter> (we mount it inside App.tsx alongside
 * <Routes>). Renders nothing.
 *
 * Sensitive search params (OAuth code/state, tokens) are redacted by
 * the session-log-init shortUrl()/redactSearch() pipeline, but we ALSO
 * pre-redact here so this component is safe even if init wasn't called.
 */
export function RouteLogger() {
  const loc = useLocation();
  useEffect(() => {
    logSession('route', 'change', {
      path: loc.pathname,
      search: redactSearchInline(loc.search),
    });
  }, [loc.pathname, loc.search]);
  return null;
}

const SENSITIVE = new Set([
  'code',
  'state',
  'token',
  'access_token',
  'id_token',
  'refresh_token',
  'password',
  'secret',
]);

function redactSearchInline(search: string): string {
  if (!search || search === '?') return '';
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    for (const k of Array.from(params.keys())) {
      if (SENSITIVE.has(k.toLowerCase())) params.set(k, '[REDACTED]');
    }
    return '?' + params.toString();
  } catch {
    return '';
  }
}
