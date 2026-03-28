import { useState, useRef, useCallback, useEffect } from 'react';
import { useApolloStore } from '@/lib/store/apollo-store';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import * as audioManager from '@/lib/audio/audio-manager';

interface UseApolloOptions {
  onTranscript?: (text: string) => void;
}

// Module-level mic permission cache — request once per page load
let micPermission: 'unknown' | 'granted' | 'denied' = 'unknown';

async function ensureMicPermission(): Promise<boolean> {
  if (micPermission === 'granted') return true;
  if (micPermission === 'denied') return false;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    micPermission = 'granted';
    console.log('[Apollo] Microphone permission granted');
    return true;
  } catch (err) {
    micPermission = 'denied';
    console.error('[Apollo] Microphone permission denied:', err);
    return false;
  }
}

export function useApollo(options?: UseApolloOptions) {
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onTranscriptRef = useRef(options?.onTranscript);

  // Read playback state from the shared store
  const isPlaying = useApolloStore((s) => s._isPlaying);
  const isPaused = useApolloStore((s) => s._isPaused);
  const currentTime = useApolloStore((s) => s._currentTime);
  const duration = useApolloStore((s) => s._duration);
  const speed = useApolloStore((s) => s._speed);
  const ttsAutoPlay = useApolloStore((s) => s.ttsAutoPlay);
  const ttsTalkMode = useApolloStore((s) => s.ttsTalkMode);
  const resumeMicAfterPlay = useApolloStore((s) => s._resumeMicAfterPlay);
  const hasTTS = useCosmosLogosStore((s) => s.agents.some(a => a.capabilities.includes('x-tts')));
  // Effective talk mode — only active when a TTS agent is connected
  const effectiveTalkMode = ttsTalkMode && hasTTS;

  useEffect(() => {
    onTranscriptRef.current = options?.onTranscript;
  }, [options?.onTranscript]);

  // --- Microphone / Speech Recognition ---

  // Synchronous recognition start (after permission is already granted)
  const startRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      console.warn('[Apollo] SpeechRecognition not supported');
      setMicError('Speech recognition not supported in this browser');
      return;
    }

    if (recognitionRef.current) recognitionRef.current.abort();

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      if (last?.isFinal) {
        const transcript = last[0]?.transcript.trim();
        console.log('[Apollo] Transcript:', transcript);
        if (transcript && onTranscriptRef.current) {
          onTranscriptRef.current(transcript);
        }
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // In talk mode, restart recognition loop (unless TTS is playing or no TTS agent connected)
      const store = useApolloStore.getState();
      const ttsConnected = useCosmosLogosStore.getState().agents.some(a => a.capabilities.includes('x-tts'));
      if (store.ttsTalkMode && ttsConnected && !store._isPlaying) {
        setTimeout(() => {
          const s = useApolloStore.getState();
          const still = useCosmosLogosStore.getState().agents.some(a => a.capabilities.includes('x-tts'));
          if (s.ttsTalkMode && still) startRecognition();
        }, 300);
      }
    };

    recognition.onerror = (event: Event & { error?: string }) => {
      const err = event.error || 'unknown';
      if (err === 'no-speech') {
        // Normal — user just didn't say anything this cycle, let onend restart
        console.log('[Apollo] No speech detected, will retry...');
      } else if (err === 'aborted') {
        // Intentional abort — ignore
      } else if (err === 'not-allowed') {
        console.error('[Apollo] Mic not allowed — check browser permissions');
        setMicError('Microphone access denied. Check browser permissions.');
        micPermission = 'denied';
      } else {
        console.error('[Apollo] Recognition error:', err);
        setMicError(`Mic error: ${err}`);
      }
      setIsListening(false);
    };

    try {
      recognition.start();
      setIsListening(true);
      setMicError(null);
      console.log('[Apollo] Listening...');
    } catch (err) {
      console.error('[Apollo] Failed to start recognition:', err);
      setMicError('Failed to start speech recognition');
      setIsListening(false);
    }
  }, []);

  // Async entry point that ensures permission first, then starts recognition
  const startListeningInternal = useCallback(async () => {
    const ok = await ensureMicPermission();
    if (!ok) {
      setMicError('Microphone access denied. Check browser permissions.');
      return;
    }
    startRecognition();
  }, [startRecognition]);

  const startListening = useCallback(() => { startListeningInternal(); }, [startListeningInternal]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Resume mic after TTS playback ends (talk mode)
  useEffect(() => {
    if (resumeMicAfterPlay) {
      useApolloStore.setState({ _resumeMicAfterPlay: false });
      if (effectiveTalkMode) {
        console.log('[Apollo] TTS ended, resuming mic...');
        startListeningInternal();
      }
    }
  }, [resumeMicAfterPlay, effectiveTalkMode, startListeningInternal]);

  // Start/stop mic when Talk Mode is toggled (only when TTS agent connected)
  useEffect(() => {
    if (effectiveTalkMode) {
      console.log('[Apollo] Talk mode ON — starting mic');
      startListeningInternal();
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      setIsListening(false);
    }
  }, [effectiveTalkMode, startListeningInternal]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  return {
    // Playback state (from shared store)
    isPlaying,
    isPaused,
    currentTime,
    duration,
    speed,
    ttsAutoPlay,

    // Microphone state
    isListening,
    isTalkMode: effectiveTalkMode,
    micError,

    // Playback controls (delegate to global manager)
    speak: audioManager.speak,
    pause: audioManager.pause,
    resume: audioManager.resume,
    cancel: audioManager.cancel,
    seekBackward: audioManager.seekBackward,
    seekForward: audioManager.seekForward,
    seekTo: audioManager.seekTo,
    setSpeed: audioManager.setSpeed,

    // Microphone controls
    startListening,
    stopListening,
  };
}
