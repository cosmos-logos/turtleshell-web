/**
 * In-memory session log. Captures the most recent N events from the SPA
 * — route changes, fetch calls, console.warn/error, window errors, and
 * explicit `logSession()` calls from app code — so that when a user
 * clicks Send Feedback, the attachment carries the 30 seconds of context
 * that preceded the moment.
 *
 * Mirrors the omens (Godot) on-disk JSONL format so the same triage
 * workflow consumes feedback from web, iOS, and game clients.
 *
 * Ring buffer per page load. Survives soft navigations (SPA routes),
 * resets on hard reload. Multi-session persistence (carryover across
 * crashes) is intentionally NOT included in v1 — add later if signals
 * warrant.
 */

/** Max events held in memory. ~100-200 KB at typical event size. */
const RING_SIZE = 1000;

/**
 * Server cap is 4 MB after base64 (~3 MB raw). We aim a bit under that
 * so the rest of the submit body (Body__c, structuredData, etc.) fits
 * inside the same 6 MB Apex heap. If serialization exceeds this, we
 * drop the oldest 25% of events and retry.
 */
const RAW_MAX_BYTES = 3 * 1024 * 1024;

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEvent {
  ts: string;
  level: LogLevel;
  sessionId: string;
  category: string;
  event: string;
  props?: Record<string, unknown>;
}

const ring: LogEvent[] = [];
let head = 0;
const sessionId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
  ? crypto.randomUUID()
  : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const sessionStart = new Date();

/**
 * Record an event into the ring. Safe to call from any code path;
 * silently no-ops if serialization fails so the log never crashes
 * the host app.
 */
export function logSession(
  category: string,
  event: string,
  props?: Record<string, unknown>,
  level: LogLevel = 'info',
): void {
  try {
    const entry: LogEvent = {
      ts: new Date().toISOString(),
      level,
      sessionId,
      category,
      event,
      ...(props ? { props } : {}),
    };
    if (ring.length < RING_SIZE) {
      ring.push(entry);
    } else {
      ring[head] = entry;
      head = (head + 1) % RING_SIZE;
    }
  } catch {
    /* never let logging break the host app */
  }
}

/** Read the buffer oldest-first. Used at submit time + by tests. */
export function getSessionLogLines(): LogEvent[] {
  if (ring.length < RING_SIZE) return ring.slice();
  return [...ring.slice(head), ...ring.slice(0, head)];
}

/** Exposed for explicit-log call sites that want to stamp consistent file naming. */
export function getSessionId(): string {
  return sessionId;
}

/**
 * Lightweight stats for the feedback form — lets us show a visible
 * "Session log: N events (~XX KB) will attach" caption near the Send
 * button. Cheaper than `captureSessionLogBase64()` (no encode, no
 * allocation over RAW_MAX_BYTES).
 */
export function getSessionLogStats(): { count: number; rawBytes: number } {
  const lines = getSessionLogLines();
  if (lines.length === 0) return { count: 0, rawBytes: 0 };
  let rawBytes = 0;
  for (const l of lines) rawBytes += JSON.stringify(l).length + 1; // +1 for '\n'
  return { count: lines.length, rawBytes };
}

/**
 * Serialize the ring to base64 JSONL for upload as
 * `ContentVersion(Feedback__c) session_*.jsonl`. Returns null when the
 * ring is empty (no events to ship). Drops oldest 25% if the raw JSONL
 * exceeds RAW_MAX_BYTES.
 */
export async function captureSessionLogBase64(): Promise<
  { fileName: string; contentBase64: string } | null
> {
  const lines = getSessionLogLines();
  if (lines.length === 0) return null;

  let jsonl = lines.map((l) => JSON.stringify(l)).join('\n') + '\n';
  let bytes = new TextEncoder().encode(jsonl);

  if (bytes.byteLength > RAW_MAX_BYTES) {
    const trimmed = lines.slice(Math.floor(lines.length / 4));
    jsonl = trimmed.map((l) => JSON.stringify(l)).join('\n') + '\n';
    bytes = new TextEncoder().encode(jsonl);
  }

  const fileName = `session_${formatStamp(sessionStart)}.jsonl`;
  const contentBase64 = bytesToBase64(bytes);
  return { fileName, contentBase64 };
}

function formatStamp(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `_${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  // Chunked to avoid call-stack overflow on large buffers (String.fromCharCode
  // spreads the entire array as args, which trips the 65k-arg ceiling).
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
