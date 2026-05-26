/**
 * Install global wrappers that pipe browser-runtime events into the
 * session-log ring. Call once from main.tsx BEFORE the React root is
 * created so the fetch wrapper catches boot-time API calls.
 *
 * Privacy floor (do NOT relax without a security review):
 *   - Auth header is never seen (we wrap fetch input/init, not the
 *     processed Request; init.headers isn't inspected).
 *   - URLs are reduced to pathname + redacted search. The denylist
 *     scrubs OAuth callback codes/state/tokens that would otherwise
 *     leak via /oauth/tool-callback/google?code=… etc.
 *   - We wrap console.warn + console.error but NEVER console.log
 *     (call sites in olympus-grid-client.ts log JWT preview data
 *     under .log — that stays out of the ring).
 *   - We never snapshot input/textarea contents. App code that wants
 *     to log a user-visible action passes character counts, never the
 *     content itself.
 */
import { logSession } from './session-log';

const SENSITIVE_PARAMS = new Set([
  'code',
  'state',
  'token',
  'access_token',
  'id_token',
  'refresh_token',
  'password',
  'secret',
]);

let installed = false;

export function installSessionLog(): void {
  if (installed) return;
  installed = true;

  logSession('boot', 'launch', {
    href: shortUrl(window.location.href),
    ua: navigator.userAgent.slice(0, 200),
  });

  wrapFetch();
  wrapConsole();
  wrapErrorEvents();
  wrapPerformanceObserver();
  wrapVisibilityAndConnectivity();
}

// ── fetch ───────────────────────────────────────────────────────────

function wrapFetch(): void {
  if (typeof window.fetch !== 'function') return;
  const origFetch = window.fetch.bind(window);
  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
    const start = performance.now();
    try {
      const resp = await origFetch(input, init);
      logSession(
        'fetch',
        resp.ok ? 'success' : `http_${resp.status}`,
        {
          method,
          url: shortUrl(url),
          status: resp.status,
          ms: Math.round(performance.now() - start),
        },
        resp.ok ? 'info' : 'warn',
      );
      return resp;
    } catch (err) {
      logSession(
        'fetch',
        'threw',
        {
          method,
          url: shortUrl(url),
          ms: Math.round(performance.now() - start),
          err: errorMessage(err),
        },
        'error',
      );
      throw err;
    }
  };
}

// ── console.warn / console.error ────────────────────────────────────

function wrapConsole(): void {
  const origWarn = console.warn.bind(console);
  const origError = console.error.bind(console);
  console.warn = (...args: unknown[]) => {
    logSession('console', 'warn', { msg: stringifyArgs(args).slice(0, 300) }, 'warn');
    origWarn(...args);
  };
  console.error = (...args: unknown[]) => {
    logSession('console', 'error', { msg: stringifyArgs(args).slice(0, 300) }, 'error');
    origError(...args);
  };
}

// ── window errors ──────────────────────────────────────────────────

function wrapErrorEvents(): void {
  window.addEventListener('error', (e) => {
    logSession(
      'error',
      'window.onerror',
      {
        msg: e.message,
        src: shortUrl(e.filename || ''),
        line: e.lineno,
        col: e.colno,
      },
      'error',
    );
  });
  window.addEventListener('unhandledrejection', (e) => {
    logSession(
      'error',
      'unhandled_rejection',
      { reason: String(e.reason).slice(0, 300) },
      'error',
    );
  });
}

// ── performance vitals (chrome-only APIs, gated by support) ─────────

function wrapPerformanceObserver(): void {
  if (typeof PerformanceObserver === 'undefined') return;
  // Long tasks (>50ms blocking the main thread) — "feels janky" signal.
  try {
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration < 100) continue; // Skip noisy near-threshold
        logSession(
          'perf',
          'longtask',
          { ms: Math.round(entry.duration) },
          'warn',
        );
      }
    });
    longTaskObserver.observe({ type: 'longtask', buffered: true });
  } catch {
    /* longtask not supported (Safari) */
  }
  // LCP — canonical Web Vitals pattern: track the running max, emit ONE
  // final value at first visibility hidden / pagehide / 5s settle. The
  // earlier implementation emitted every LCP candidate (3 entries per
  // page load in the FB-00006 log) — high noise, low signal.
  try {
    let lcpMs = 0;
    let lcpReported = false;
    let lcpSettleTimer: number | undefined;

    const reportLcp = () => {
      if (lcpReported || lcpMs === 0) return;
      lcpReported = true;
      logSession('perf', 'lcp', { ms: Math.round(lcpMs) });
    };

    const lcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.startTime > lcpMs) lcpMs = entry.startTime;
      }
      // No new LCP candidate for 5s → page settled, emit. Guarantees the
      // LCP lands in the ring before any feedback submit on a page
      // that stays visible.
      if (lcpSettleTimer) clearTimeout(lcpSettleTimer);
      lcpSettleTimer = window.setTimeout(reportLcp, 5000);
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') reportLcp();
    });
    window.addEventListener('pagehide', reportLcp);
  } catch {
    /* not supported */
  }
}

// ── visibility + online/offline ────────────────────────────────────

function wrapVisibilityAndConnectivity(): void {
  document.addEventListener('visibilitychange', () => {
    logSession('lifecycle', 'visibility', { state: document.visibilityState });
  });
  window.addEventListener('online', () => logSession('lifecycle', 'online'));
  window.addEventListener('offline', () => logSession('lifecycle', 'offline', undefined, 'warn'));
}

// ── helpers ────────────────────────────────────────────────────────

/**
 * Reduce a full URL to `pathname + redactedSearch`. Strips host so logs
 * don't leak the ngrok subdomain, and scrubs sensitive query params.
 */
function shortUrl(u: string): string {
  if (!u) return '';
  try {
    // Relative URLs need a base — use window origin since this is
    // purely for logging, not for fetch resolution.
    const url = new URL(u, window.location.origin);
    return url.pathname + redactSearch(url.search);
  } catch {
    return u.slice(0, 200);
  }
}

function redactSearch(search: string): string {
  if (!search || search === '?') return '';
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    let touched = false;
    for (const k of Array.from(params.keys())) {
      if (SENSITIVE_PARAMS.has(k.toLowerCase())) {
        params.set(k, '[REDACTED]');
        touched = true;
      }
    }
    const out = '?' + params.toString();
    return touched ? out : '?' + search.replace(/^\?/, '');
  } catch {
    return '';
  }
}

function stringifyArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === 'string') return a;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(' ');
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, 300);
  return String(err).slice(0, 300);
}
