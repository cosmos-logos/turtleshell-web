/**
 * Global singleton audio manager.
 * One audio element shared across the entire app.
 * State is pushed into the apollo Zustand store so any component can read it.
 */
import { useApolloStore } from '@/lib/store/apollo-store';

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

export async function speak(text: string) {
  cleanup();

  const baseUrl = useApolloStore.getState().getTTSBaseUrl();
  if (!baseUrl) return;

  fetchController = new AbortController();
  useApolloStore.setState({ _isBuffering: true });

  try {
    const res = await fetch(`${baseUrl}/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: fetchController.signal,
    });
    if (!res.ok) { console.error('[Apollo] TTS error:', res.status); cleanup(); return; }

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
