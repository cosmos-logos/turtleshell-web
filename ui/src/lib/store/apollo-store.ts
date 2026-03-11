import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TTSEnvironment = 'cloud' | 'offgrid' | 'custom';

const TTS_URLS: Record<TTSEnvironment, string> = {
  cloud: 'https://api-int.turtleshell.ai/v1/apollo',
  offgrid: 'https://athena-616.ngrok.io/v1/apollo',
  custom: '',
};

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
    (set, get) => ({
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
        const state = get();
        if (state.ttsMode === 'custom') {
          return state.ttsCustomUrl;
        }
        return TTS_URLS[state.ttsMode];
      },
    }),
    {
      name: 'turtleshell-apollo',
      partialize: (state) => ({
        ttsMode: state.ttsMode,
        ttsCustomUrl: state.ttsCustomUrl,
        ttsAutoPlay: state.ttsAutoPlay,
        ttsTalkMode: state.ttsTalkMode,
      }),
    },
  ),
);
