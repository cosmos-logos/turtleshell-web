import { useState, useRef, useCallback, useEffect } from 'react';
import { useApolloStore } from '@/lib/store/apollo-store';
import * as audioManager from '@/lib/audio/audio-manager';

interface UseApolloOptions {
  onTranscript?: (text: string) => void;
}

export function useApollo(options?: UseApolloOptions) {
  const [isListening, setIsListening] = useState(false);
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

  useEffect(() => {
    onTranscriptRef.current = options?.onTranscript;
  }, [options?.onTranscript]);

  // Resume mic after TTS playback ends (talk mode)
  useEffect(() => {
    if (resumeMicAfterPlay) {
      useApolloStore.setState({ _resumeMicAfterPlay: false });
      if (ttsTalkMode) {
        startListeningInternal();
      }
    }
  }, [resumeMicAfterPlay, ttsTalkMode]);

  // --- Microphone / Speech Recognition ---

  const startListeningInternal = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      console.warn('[Apollo] SpeechRecognition not supported');
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
        if (transcript && onTranscriptRef.current) {
          onTranscriptRef.current(transcript);
        }
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (useApolloStore.getState().ttsTalkMode && !useApolloStore.getState()._isPlaying) {
        setTimeout(() => {
          if (useApolloStore.getState().ttsTalkMode) startListeningInternal();
        }, 300);
      }
    };

    recognition.onerror = (event: Event & { error?: string }) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.error('[Apollo] Speech recognition error:', event.error);
      }
      setIsListening(false);
    };

    recognition.start();
    setIsListening(true);
  }, []);

  const startListening = useCallback(() => startListeningInternal(), [startListeningInternal]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop(); // stop() lets pending results fire; abort() discards them
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Start/stop mic when Talk Mode is toggled
  useEffect(() => {
    if (ttsTalkMode) {
      startListeningInternal();
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      setIsListening(false);
    }
  }, [ttsTalkMode, startListeningInternal]);

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
    isTalkMode: ttsTalkMode,

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
