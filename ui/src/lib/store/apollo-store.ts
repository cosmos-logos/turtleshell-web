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
        // Read cosmos-logos agents from persisted localStorage to avoid circular import
        try {
          const raw = localStorage.getItem('turtleshell-cosmos-agents');
          if (raw) {
            const { state } = JSON.parse(raw);
            const ttsAgent = state?.agents?.find((a: any) => a.capabilities?.includes('x-tts'));
            if (ttsAgent) return ttsAgent.url;
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
