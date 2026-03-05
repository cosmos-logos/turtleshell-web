import { Pause, Play, X, SkipBack, SkipForward, Loader2 } from 'lucide-react';

interface AudioPlayerBarProps {
  isPlaying: boolean;
  isPaused: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onSeekBackward: () => void;
  onSeekForward: () => void;
  onSetSpeed: (speed: number) => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const SPEEDS = [1.0, 1.25, 1.5, 1.75, 2.0];

export function AudioPlayerBar({
  isPlaying,
  isPaused,
  isBuffering,
  currentTime,
  duration,
  speed,
  onPause,
  onResume,
  onCancel,
  onSeekBackward,
  onSeekForward,
  onSetSpeed,
}: AudioPlayerBarProps) {
  if (!isPlaying && !isPaused && !isBuffering) return null;

  return (
    <div className="fixed bottom-[60px] left-1/2 -translate-x-1/2 z-20 bg-surface-1/90 backdrop-blur-md border border-border-muted/30 rounded-full px-3 py-1 shadow-lg shadow-black/20 animate-fade-in">
      <div className="flex items-center gap-1">
        {isBuffering ? (
          <>
            <Loader2 size={13} className="text-shell-400 animate-spin" />
            <span className="text-[9px] text-text-muted/60 ml-1">Buffering...</span>
            <button
              onClick={onCancel}
              className="p-1 rounded text-text-muted/40 hover:text-red-400/70 transition-colors ml-1"
              title="Cancel"
            >
              <X size={11} />
            </button>
          </>
        ) : (
          <>
            <span className="font-mono text-[9px] text-text-muted/60 tabular-nums mr-1">
              {formatTime(currentTime)}/{formatTime(duration)}
            </span>

            <button
              onClick={onSeekBackward}
              className="p-1 rounded text-text-muted/50 hover:text-text-muted transition-colors"
              title="-10s"
            >
              <SkipBack size={11} />
            </button>

            <button
              onClick={isPaused ? onResume : onPause}
              className="p-1 rounded text-text-muted/70 hover:text-text-secondary transition-colors"
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play size={13} /> : <Pause size={13} />}
            </button>

            <button
              onClick={onSeekForward}
              className="p-1 rounded text-text-muted/50 hover:text-text-muted transition-colors"
              title="+10s"
            >
              <SkipForward size={11} />
            </button>

            <button
              onClick={() => {
                const idx = SPEEDS.indexOf(speed);
                onSetSpeed(SPEEDS[(idx + 1) % SPEEDS.length] ?? 1.0);
              }}
              className="font-mono text-[9px] text-text-muted/50 hover:text-text-muted px-1.5 py-0.5 rounded transition-colors tabular-nums"
              title="Playback speed"
            >
              {speed}x
            </button>

            <button
              onClick={onCancel}
              className="p-1 rounded text-text-muted/40 hover:text-red-400/70 transition-colors ml-0.5"
              title="Stop"
            >
              <X size={11} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
