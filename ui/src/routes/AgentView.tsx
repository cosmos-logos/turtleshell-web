import { useParams, Navigate } from 'react-router-dom';
import { useRef, useEffect, useMemo } from 'react';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import { useThemeStore } from '@/lib/store/theme-store';

export function AgentView() {
  const { agentId } = useParams<{ agentId: string }>();
  const agent = useCosmosLogosStore((s) => s.agents.find((a) => a.id === agentId));
  const theme = useThemeStore((s) => s.theme);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Build iframe URL with shell_theme param
  const src = useMemo(() => {
    if (!agent) return '';
    const base = agent.manifest.display?.app_url ?? agent.url;
    try {
      const url = new URL(base);
      url.searchParams.set('shell_theme', theme);
      url.searchParams.set('_v', '4');
      return url.toString();
    } catch {
      // Relative or malformed URL — append as query string
      const sep = base.includes('?') ? '&' : '?';
      return `${base}${sep}shell_theme=${theme}`;
    }
  }, [agent, theme]);

  // Send theme changes to iframe via postMessage
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    iframe.contentWindow.postMessage(
      { type: 'shell:theme', theme },
      '*',
    );
  }, [theme]);

  // Also send theme once iframe loads (in case it loaded before the effect ran)
  const handleLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      { type: 'shell:theme', theme },
      '*',
    );
  };

  if (!agent) return <Navigate to="/app/agents" replace />;

  console.log('[AgentView]', { agentId, theme, src });

  return (
    <div className="flex-1 overflow-hidden" style={{ display: 'flex', flexDirection: 'column' }}>
      <iframe
        ref={iframeRef}
        src={src}
        onLoad={handleLoad}
        style={{
          flex: 1,
          width: '100%',
          border: 'none',
          display: 'block',
          background: theme === 'dark' ? '#0c0c14' : '#ffffff',
        }}
        title={agent.manifest.identity.name}
        allow="camera; microphone; clipboard-read; clipboard-write; fullscreen"
      />
    </div>
  );
}
