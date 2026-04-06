import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TTSEnvironment = 'cloud' | 'offgrid' | 'custom';


interface ApolloStore {
  // Persisted settings
  ttsMode: TTSEnvironment;
  ttsCustomUrl: string;
  ttsAutoPlay: boolean;
  ttsTalkMode: boolean;

  // Runtime playback state (not persisted)
  _isPlaying: boolean;
  _isPaused: boolean;
  _currentTime: number;
  _duration: number;
  _speed: number;
  _isBuffering: boolean;
  _resumeMicAfterPlay: boolean;

  setTTSMode: (mode: TTSEnvironment) => void;
  setTTSCustomUrl: (url: string) => void;
  setTTSAutoPlay: (enabled: boolean) => void;
  setTTSTalkMode: (enabled: boolean) => void;
  getTTSBaseUrl: () => string;
}

export const useApolloStore = create<ApolloStore>()(
  persist(
    (set) => ({
      ttsMode: 'offgrid',
      ttsCustomUrl: '',
      ttsAutoPlay: true,
      ttsTalkMode: false,

      // Runtime defaults (not persisted — see partialize below)
      _isPlaying: false,
      _isPaused: false,
      _currentTime: 0,
      _duration: 0,
      _speed: 1.0,
      _isBuffering: false,
      _resumeMicAfterPlay: false,

      setTTSMode: (ttsMode) => set({ ttsMode }),
      setTTSCustomUrl: (ttsCustomUrl) => set({ ttsCustomUrl }),
      setTTSAutoPlay: (ttsAutoPlay) => set({ ttsAutoPlay }),
      setTTSTalkMode: (ttsTalkMode) => set({ ttsTalkMode }),

      getTTSBaseUrl: () => {
        // Discover TTS endpoint from cosmos-logos agents with x-tts capability.
        // Returns the full TTS URL (agent base + capability path from manifest).
        try {
          const raw = localStorage.getItem('turtleshell-cosmos-agents');
          if (raw) {
            const parsed = JSON.parse(raw);
            const agents = parsed.state?.agents ?? parsed.agents ?? [];
            const ttsAgent = agents.find((a: any) => a.capabilities?.includes('x-tts'));
            if (ttsAgent) {
              const cap = ttsAgent.manifest?.capabilities?.find((c: any) => c.verb === 'x-tts');
              if (cap?.path) return `${ttsAgent.url}${cap.path}`;
              return `${ttsAgent.url}/play`; // fallback if no path in manifest
            }
          }
        } catch {}
        return '';
      },
    }),
    {
      name: 'turtleshell-apollo',
      partialize: (state) => ({
        ttsMode: state.ttsMode,
        ttsCustomUrl: state.ttsCustomUrl,
        ttsAutoPlay: state.ttsAutoPlay,
        ttsTalkMode: state.ttsTalkMode,
        _speed: state._speed,
      }),
    },
  ),
);
