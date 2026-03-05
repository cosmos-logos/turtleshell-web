import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useState } from 'react';
import { useApolloStore } from '@/lib/store/apollo-store';
import * as audioManager from '@/lib/audio/audio-manager';
import { AudioPlayerBar } from '@/components/audio/AudioPlayerBar';

export function AppShell() {
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const { _isPlaying: isPlaying, _isPaused: isPaused, _isBuffering: isBuffering, _currentTime: currentTime, _duration: duration, _speed: speed } = useApolloStore();

  return (
    <div className="app-shell">
      {/* Mobile overlay backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Desktop sidebar — LEFT, inline */}
      <div className="hidden md:block flex-shrink-0">
        <Sidebar
          open={desktopSidebarOpen}
          onToggle={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
          onClose={() => setDesktopSidebarOpen(false)}
          position="left"
        />
      </div>

      {/* Main content */}
      <div className="main-content">
        <Header
          desktopSidebarOpen={desktopSidebarOpen}
          onDesktopSidebarToggle={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
          onMobileMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />
        <Outlet />
        <AudioPlayerBar
          isPlaying={isPlaying}
          isPaused={isPaused}
          isBuffering={isBuffering}
          currentTime={currentTime}
          duration={duration}
          speed={speed}
          onPause={audioManager.pause}
          onResume={audioManager.resume}
          onCancel={audioManager.cancel}
          onSeekBackward={audioManager.seekBackward}
          onSeekForward={audioManager.seekForward}
          onSetSpeed={audioManager.setSpeed}
        />
      </div>

      {/* Mobile sidebar — RIGHT, overlay */}
      <div className="md:hidden">
        <Sidebar
          open={mobileSidebarOpen}
          onToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          onClose={() => setMobileSidebarOpen(false)}
          position="right"
        />
      </div>
    </div>
  );
}
