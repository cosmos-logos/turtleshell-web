/**
 * Global singleton audio manager.
 * One audio element shared across the entire app.
 * State is pushed into the apollo Zustand store so any component can read it.
 */
import { useApolloStore } from '@/lib/store/apollo-store';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import { useAgentStore } from '@/lib/store/agent-store';
import { useEnvironmentStore, applyClusterOverride } from '@/lib/store/environment-store';
import { useSovereignAiStore } from '@/lib/store/sovereign-ai-store';
import { sealForWire } from '@/lib/sovereign-ai/envelope';
import { loadSlot, deleteSlot } from '@/lib/sovereign-ai/secure-storage';
import { logSession } from '@/lib/api/session-log';

let audio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;
let raf = 0;
let fetchController: AbortController | null = null;

function cleanup() {
  if (fetchController) { fetchController.abort(); fetchController = null; }
  if (raf) { cancelAnimationFrame(raf); raf = 0; }
  if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); audio = null; }
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
  useApolloStore.setState({ _isPlaying: false, _isPaused: false, _isBuffering: false, _currentTime: 0, _duration: 0 });
}

function trackTime() {
  if (audio) {
    useApolloStore.setState({ _currentTime: audio.currentTime });
    raf = requestAnimationFrame(trackTime);
  }
}

/**
 * Resolve the active agent's voice config for the TTS request.
 * Checks cosmos-logos agents first, then built-in agents.
 */
function getActiveVoiceIntent(): Record<string, unknown> | undefined {
  const activeChatAgentId = useCosmosLogosStore.getState().activeChatAgentId;

  // Check cosmos-logos agent voice
  if (activeChatAgentId) {
    const agent = useCosmosLogosStore.getState().agents.find(a => a.id === activeChatAgentId);
    if (agent?.manifest.voice?.engines) {
      const preferred = agent.manifest.voice.preferred_engine;
      const engine = preferred && agent.manifest.voice.engines[preferred]
        ? agent.manifest.voice.engines[preferred]
        : Object.values(agent.manifest.voice.engines)[0];
      if (engine) {
        return { voiceId: engine.voice_id, model: engine.model, engine: preferred };
      }
    }
  }

  // Check built-in agent voice
  const builtin = useAgentStore.getState().activeAgent;
  if (builtin?.voice?.engines) {
    const preferred = builtin.voice.preferred_engine;
    const engine = preferred && builtin.voice.engines[preferred]
      ? builtin.voice.engines[preferred]
      : Object.values(builtin.voice.engines)[0];
    if (engine) {
      return { voiceId: engine.voice_id, model: engine.model, engine: preferred };
    }
  }

  return undefined;
}

/** Decode a base64-encoded provenance-JSON HTTP header. Apollo emits this on
 *  every /v1/apollo/speak response — same fields as the chat SSE provenance
 *  frame, but the audio body is binary so headers are the only channel. */
function decodeVoiceProvenanceHeader(headerValue: string | null): Record<string, unknown> | null {
  if (!headerValue) return null;
  try {
    const raw = atob(headerValue);
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[Apollo] provenance header decode failed:', err);
    return null;
  }
}

/** Resolve the /v1/apollo/speak URL to hit. Prefer the environment store's
 *  Apollo endpoint (goes through Ares → Hermes → Apollo, same perimeter as
 *  chat); fall back to the legacy cosmos-logos agent discovery for users
 *  still connected via the old handshake path. */
function resolveApolloSpeakUrl(): { url: string; via: 'sovereign' | 'legacy' } | null {
  // Sovereign path — env-store Apollo URL + /speak (Apollo listens on /speak
  // AND /v1/apollo/speak; both hit the same handler). Route through Ares by
  // using the env-store's apollo endpoint, then apply the cluster override so
  // the currently-active Pantheon is targeted, not whatever URL was cached.
  const envApollo = useEnvironmentStore.getState().endpoints.apollo;
  if (envApollo) {
    const withCluster = applyClusterOverride(envApollo);
    return { url: `${withCluster.replace(/\/+$/, '')}/speak`, via: 'sovereign' };
  }
  // Legacy fallback — pre-EOS-5.4 cosmos-logos x-tts agent discovery.
  const legacy = useApolloStore.getState().getTTSBaseUrl();
  if (legacy) return { url: legacy, via: 'legacy' };
  return null;
}

export async function speak(text: string) {
  cleanup();

  const resolved = resolveApolloSpeakUrl();
  if (!resolved) return;

  fetchController = new AbortController();
  useApolloStore.setState({ _isBuffering: true });

  const intent = getActiveVoiceIntent();

  // EOS-5.4 sovereign envelope — seal the BYOK payload when the user has
  // picked a non-Olympus-Grid voice provider in Settings. The wire body
  // carries a `sovereignAI` block; Apollo decrypts, routes to the picked
  // adapter (OpenAI TTS / ElevenLabs / XTTS), and returns audio + a
  // base64-encoded `x-og-provenance` response header carrying the honest
  // attribution. When the user is on the Olympus-Grid path (default), no
  // block is attached and Apollo's server-side voice engine handles it.
  const sai = useSovereignAiStore.getState();
  const wantSovereign = sai.useAI && sai.voiceProvider !== 'olympus-grid' && resolved.via === 'sovereign';
  const clientSurface = 'turtleshell-web';
  let sovereignBlock: {
    voiceProvider: string;
    sealedEnvelope: string;
    envelopeFormat: string;
    envelopeVersion: string;
    manifestUrl: string;
  } | null = null;

  if (wantSovereign) {
    // Load the previously-sealed inner ciphertext from IndexedDB. If no
    // slot is stored for this voice provider, the user hasn't done the
    // paste ceremony yet — surface a helpful error and stop.
    const slot = await loadSlot('voice', sai.voiceProvider);
    if (!slot) {
      console.warn('[Apollo] no sovereign voice slot stored — user must add key in Settings');
      logSession('apollo.speak', 'sovereign_ai.slot_missing', {
        provider: sai.voiceProvider,
      }, 'warn');
      cleanup();
      throw new Error(
        `Sovereign Voice: no sealed key stored for ${sai.voiceProvider}. Open Settings → Sovereign AI to add one.`,
      );
    }
    try {
      // Apollo manifest lives adjacent to /speak on the same perimeter path.
      const apolloBase = resolved.url.replace(/\/speak\/?$/, '');
      const manifestUrl = `${apolloBase}/.well-known/cosmos-logos.json`;
      const sealed = await sealForWire(manifestUrl, slot.storedInner, clientSurface);
      sovereignBlock = {
        voiceProvider: sai.voiceProvider,
        sealedEnvelope: sealed.sealedEnvelopeBase64,
        envelopeFormat: sealed.envelopeFormat,
        envelopeVersion: sealed.envelopeVersion,
        manifestUrl: sealed.manifestUrl,
      };
      logSession('apollo.speak', 'sovereign_ai.wrapped', {
        provider: sai.voiceProvider,
        godRecipient: slot.godRecipient,
        format: sealed.envelopeFormat,
        version: sealed.envelopeVersion,
      });
    } catch (err) {
      console.warn('[Apollo] sovereign seal failed, falling through to house path:', err);
      logSession('apollo.speak', 'sovereign_ai.seal_failed', {
        provider: sai.voiceProvider,
        err: (err as Error).message.slice(0, 200),
      }, 'warn');
      // Fail-open on voice (unlike chat which fail-safes): degrading to house
      // costs one tithe but the user still hears the response. Steward can
      // toggle to fail-safe later if the audit boundary needs to be strict.
    }
  }

  try {
    // Build headers — include x-user-identity JWT for Ares like streamChat does.
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-client-surface': clientSurface,
    };
    const ogToken = localStorage.getItem('og_access_token');
    if (ogToken) headers['x-user-identity'] = ogToken;

    // Sovereign path — DO NOT send the legacy `intent` field. That field is
    // populated from the active chat agent's voice manifest (e.g. Athena
    // uses `{voiceId:'shimmer',model:'gpt-4o-mini-tts'}` from its OpenAI
    // profile), which is nonsensical for other providers. ElevenLabs
    // interprets voiceId='shimmer' as an unknown voice → 400 → Apollo 500.
    // When sovereign is on, Apollo's server-side per-provider defaults
    // (sovereign-defaults.ts — Rachel for ElevenLabs, default.wav for XTTS,
    // shimmer for OpenAI TTS) handle the voice cleanly. Legacy path still
    // rides the intent because the connected cosmos-logos agent's voice
    // is authoritative in that case.
    const bodyPayload = sovereignBlock
      ? { text, format: 'mp3' as const, sovereignAI: sovereignBlock }
      : { text, intent, format: 'mp3' as const };
    const res = await fetch(resolved.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyPayload),
      signal: fetchController.signal,
    });
    if (!res.ok) {
      // ── Rotation kill-switch (voice edition) ── When Apollo returns
      // envelope_storage_stale we wipe the stored inner + slot metadata so
      // the user re-enters through the ceremony. Steward's 2026-07-07
      // "rotation kills stored keys" property landing on the voice wire.
      const errBody = await res.text().catch(() => '');
      if (sovereignBlock && errBody.includes('envelope_storage_stale')) {
        const provider = sai.voiceProvider;
        try {
          await deleteSlot('voice', provider);
        } catch { /* store cleanup below carries the UI state */ }
        useSovereignAiStore.getState().clearVoiceSlot(provider);
        console.warn('[Apollo] cosmos-logos key rotated — voice slot invalidated. Re-enter in Settings.');
      }
      console.error('[Apollo] TTS error:', res.status);
      cleanup();
      return;
    }

    // EOS-5.4 provenance header — log to session-log for cross-surface audit.
    const provenance = decodeVoiceProvenanceHeader(res.headers.get('x-og-provenance'));
    if (provenance) {
      logSession('apollo.speak', 'provenance.received', {
        voiceProvider: String(provenance.voiceProvider ?? ''),
        voiceModel: String(provenance.voiceModel ?? ''),
        byokUsed: provenance.byokUsed === true,
        endpointClass: String(provenance.endpointClass ?? ''),
        turnCorrelationId: String(provenance.turnCorrelationId ?? ''),
      });
    }

    const blob = await res.blob();
    fetchController = null;
    objectUrl = URL.createObjectURL(blob);
    audio = new Audio(objectUrl);
    audio.playbackRate = useApolloStore.getState()._speed;

    audio.addEventListener('loadedmetadata', () => {
      useApolloStore.setState({ _duration: audio?.duration ?? 0 });
    });

    audio.addEventListener('ended', () => {
      cleanup();
      if (useApolloStore.getState().ttsTalkMode) {
        // Re-enable mic after playback — listeners handle this via store
        useApolloStore.setState({ _resumeMicAfterPlay: true });
      }
    });

    audio.addEventListener('error', () => cleanup());

    await audio.play();
    useApolloStore.setState({ _isPlaying: true, _isPaused: false, _isBuffering: false });
    raf = requestAnimationFrame(trackTime);
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.error('[Apollo] speak() failed:', err);
    }
    cleanup();
  }
}

export function pause() {
  if (audio && !audio.paused) {
    audio.pause();
    useApolloStore.setState({ _isPaused: true });
  }
}

export function resume() {
  if (audio && audio.paused) {
    audio.play();
    useApolloStore.setState({ _isPaused: false });
  }
}

export function cancel() {
  cleanup();
}

export function seekBackward() {
  if (audio) audio.currentTime = Math.max(0, audio.currentTime - 10);
}

export function seekForward() {
  if (audio) audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
}

export function seekTo(time: number) {
  if (audio) audio.currentTime = time;
}

export function setSpeed(speed: number) {
  useApolloStore.setState({ _speed: speed });
  if (audio) audio.playbackRate = speed;
}
