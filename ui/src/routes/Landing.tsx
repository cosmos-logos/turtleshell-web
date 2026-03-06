import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

type Surface = 'web' | 'iphone' | 'android' | 'desktop' | 'salesforce' | 'cli';

const surfaces: { id: Surface; label: string; icon: string; badge?: string }[] = [
  { id: 'web', label: 'Web', icon: '🌐' },
  { id: 'iphone', label: 'iPhone', icon: '📱' },
  { id: 'android', label: 'Android', icon: '🤖', badge: 'Soon' },
  { id: 'desktop', label: 'Desktop', icon: '🖥️', badge: 'Soon' },
  { id: 'salesforce', label: 'Salesforce', icon: '☁️', badge: 'Soon' },
  { id: 'cli', label: 'CLI', icon: '⌨️', badge: 'Soon' },
];

function CLIMockup() {
  return (
    <div className="bg-surface-1 border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-surface-2 border-b border-border-muted">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
        <span className="ml-2 text-2xs text-text-muted font-mono">turtleshell</span>
      </div>
      <div className="p-5 font-mono text-xs sm:text-sm leading-loose text-text-secondary text-left min-h-[200px]">
        <div>
          <span className="text-shell-400">athena &gt;</span>{' '}
          <span className="text-text-primary">Show me the open support cases from Salesforce with priority P1</span>
        </div>
        <div className="pl-4 border-l-2 border-border-muted my-2">
          <span className="text-text-muted">// Querying Salesforce via MCP...</span>
          <br />
          Found <strong className="text-shell-400">3 open P1 cases</strong>:
          <br /><br />
          <span className="text-text-primary">CASE-1042</span> — Payment gateway timeout (Acme Corp)
          <br />
          <span className="text-text-primary">CASE-1038</span> — SSO login failure (TechNova Inc)
          <br />
          <span className="text-text-primary">CASE-1035</span> — Data sync error (Global Systems)
          <br /><br />
          <span className="text-text-muted">Shall I draft responses for any of these?</span>
        </div>
      </div>
    </div>
  );
}

function WebMockup() {
  return (
    <div className="bg-surface-1 border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-surface-2 border-b border-border-muted">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
        <div className="ml-3 flex-1 h-6 bg-surface-3 rounded-md flex items-center px-3">
          <span className="text-2xs text-text-muted font-mono">turtleshell.ai/app/chat</span>
        </div>
      </div>
      <div className="flex min-h-[240px]">
        {/* Sidebar */}
        <div className="w-14 bg-surface-2 border-r border-border-muted flex flex-col items-center py-3 gap-3">
          <div className="w-8 h-8 rounded-lg bg-shell-500/20 flex items-center justify-center text-xs">🐢</div>
          <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center text-xs text-text-muted">💬</div>
          <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center text-xs text-text-muted">🔗</div>
          <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center text-xs text-text-muted">⚙️</div>
        </div>
        {/* Chat area */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-shell-500/20 flex-shrink-0 flex items-center justify-center text-2xs">🐢</div>
              <div className="bg-surface-2 rounded-lg rounded-tl-none px-3 py-2 max-w-[80%]">
                <p className="text-xs text-text-secondary">How can I help you today? I have access to your Salesforce, GitHub, and Slack connections.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <div className="bg-shell-500/10 border border-shell-500/20 rounded-lg rounded-tr-none px-3 py-2 max-w-[80%]">
                <p className="text-xs text-text-primary">Pull the latest P1 cases and draft follow-ups</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-shell-500/20 flex-shrink-0 flex items-center justify-center text-2xs">🐢</div>
              <div className="bg-surface-2 rounded-lg rounded-tl-none px-3 py-2 max-w-[80%]">
                <p className="text-xs text-text-muted">Querying Salesforce...</p>
                <div className="mt-1 flex gap-1">
                  <div className="w-1 h-1 rounded-full bg-shell-400 animate-pulse" />
                  <div className="w-1 h-1 rounded-full bg-shell-400 animate-pulse [animation-delay:150ms]" />
                  <div className="w-1 h-1 rounded-full bg-shell-400 animate-pulse [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <div className="flex-1 h-9 bg-surface-2 border border-border-muted rounded-lg flex items-center px-3">
              <span className="text-2xs text-text-muted">Message Athena...</span>
            </div>
            <div className="h-9 w-9 bg-shell-500 rounded-lg flex items-center justify-center text-white text-xs">↑</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhoneMockup({ label }: { label: string }) {
  return (
    <div className="flex justify-center">
      <div className="w-[260px] rounded-[2rem] border-2 border-border bg-surface-1 p-2 shadow-xl">
        {/* Notch */}
        <div className="flex justify-center mb-1">
          <div className="w-24 h-5 bg-surface-0 rounded-b-xl" />
        </div>
        {/* Screen */}
        <div className="bg-surface-0 rounded-2xl overflow-hidden min-h-[340px] flex flex-col">
          {/* Status bar */}
          <div className="flex items-center justify-between px-4 py-1.5">
            <span className="text-2xs text-text-muted font-medium">9:41</span>
            <span className="text-2xs text-text-muted">{label}</span>
            <div className="flex gap-1">
              <div className="w-3.5 h-2 bg-text-muted/40 rounded-sm" />
              <div className="w-1.5 h-2 bg-text-muted/40 rounded-sm" />
            </div>
          </div>
          {/* App header */}
          <div className="px-4 py-2 border-b border-border-muted flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-shell-500/20 flex items-center justify-center text-xs">🐢</div>
            <span className="text-xs font-semibold text-text-primary">TurtleShell</span>
          </div>
          {/* Chat */}
          <div className="flex-1 p-3 space-y-2.5">
            <div className="flex gap-1.5">
              <div className="w-5 h-5 rounded-full bg-shell-500/20 flex-shrink-0 flex items-center justify-center text-2xs">🐢</div>
              <div className="bg-surface-2 rounded-lg rounded-tl-none px-2.5 py-1.5 max-w-[85%]">
                <p className="text-2xs text-text-secondary leading-relaxed">Welcome back! What can I help with?</p>
              </div>
            </div>
            <div className="flex gap-1.5 justify-end">
              <div className="bg-shell-500/10 border border-shell-500/20 rounded-lg rounded-tr-none px-2.5 py-1.5 max-w-[85%]">
                <p className="text-2xs text-text-primary leading-relaxed">Check my calendar for conflicts this week</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <div className="w-5 h-5 rounded-full bg-shell-500/20 flex-shrink-0 flex items-center justify-center text-2xs">🐢</div>
              <div className="bg-surface-2 rounded-lg rounded-tl-none px-2.5 py-1.5 max-w-[85%]">
                <p className="text-2xs text-text-secondary leading-relaxed">Checking Google Calendar via MCP...</p>
                <p className="text-2xs text-shell-400 mt-1 font-medium">Found 2 conflicts on Thursday.</p>
              </div>
            </div>
          </div>
          {/* Input */}
          <div className="p-2.5 border-t border-border-muted flex gap-2">
            <div className="flex-1 h-7 bg-surface-2 border border-border-muted rounded-full flex items-center px-3">
              <span className="text-2xs text-text-muted">Message...</span>
            </div>
            <div className="h-7 w-7 bg-shell-500 rounded-full flex items-center justify-center text-white text-2xs">↑</div>
          </div>
        </div>
        {/* Home bar */}
        <div className="flex justify-center mt-1.5">
          <div className="w-28 h-1 bg-text-muted/30 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function IPhoneMockup() {
  return <PhoneMockup label="TurtleShell" />;
}

function AndroidMockup() {
  return <PhoneMockup label="TurtleShell" />;
}

function DesktopMockup() {
  return (
    <div className="bg-surface-1 border border-border rounded-xl overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-2 border-b border-border-muted">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
        </div>
        <span className="text-2xs text-text-muted font-medium">TurtleShell — Desktop App</span>
        <div className="w-16" />
      </div>
      <div className="flex min-h-[240px]">
        {/* Sidebar */}
        <div className="w-48 bg-surface-2/50 border-r border-border-muted p-3 space-y-1.5">
          <div className="flex items-center gap-2 px-2 py-1.5 bg-shell-500/10 rounded-md">
            <span className="text-xs">💬</span>
            <span className="text-xs font-medium text-text-primary">Chat</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
            <span className="text-xs">🔗</span>
            <span className="text-xs text-text-muted">Services</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
            <span className="text-xs">🤖</span>
            <span className="text-xs text-text-muted">Agents</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
            <span className="text-xs">📚</span>
            <span className="text-xs text-text-muted">History</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
            <span className="text-xs">⚙️</span>
            <span className="text-xs text-text-muted">Settings</span>
          </div>
          <div className="mt-4 pt-3 border-t border-border-muted">
            <div className="px-2 text-2xs text-text-muted">Connected</div>
            <div className="mt-1.5 space-y-1">
              <div className="flex items-center gap-1.5 px-2"><div className="w-1.5 h-1.5 rounded-full bg-shell-400" /><span className="text-2xs text-text-muted">Salesforce</span></div>
              <div className="flex items-center gap-1.5 px-2"><div className="w-1.5 h-1.5 rounded-full bg-shell-400" /><span className="text-2xs text-text-muted">GitHub</span></div>
              <div className="flex items-center gap-1.5 px-2"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400" /><span className="text-2xs text-text-muted">Slack</span></div>
            </div>
          </div>
        </div>
        {/* Main */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-shell-500/20 flex-shrink-0 flex items-center justify-center text-2xs">🐢</div>
              <div className="bg-surface-2 rounded-lg rounded-tl-none px-3 py-2 max-w-[75%]">
                <p className="text-xs text-text-secondary">Ready. You have 3 services connected and 2 agents available.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <div className="bg-shell-500/10 border border-shell-500/20 rounded-lg rounded-tr-none px-3 py-2 max-w-[75%]">
                <p className="text-xs text-text-primary">Sync my latest GitHub PRs to Salesforce</p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <div className="flex-1 h-9 bg-surface-2 border border-border-muted rounded-lg flex items-center px-3">
              <span className="text-2xs text-text-muted">Message Athena...</span>
            </div>
            <div className="h-9 w-9 bg-shell-500 rounded-lg flex items-center justify-center text-white text-xs">↑</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SalesforceMockup() {
  return (
    <div className="bg-surface-1 border border-border rounded-xl overflow-hidden">
      {/* SF header bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border-muted" style={{ background: 'linear-gradient(135deg, #032D60, #0176D3)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center text-xs">☁️</div>
          <span className="text-xs font-semibold text-white/90">Sales Cloud</span>
        </div>
        <div className="flex-1 h-6 bg-white/10 rounded flex items-center px-2.5">
          <span className="text-2xs text-white/50">Search Salesforce...</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-2xs text-white/70">🔔</div>
          <div className="w-6 h-6 rounded-full bg-shell-500 flex items-center justify-center text-2xs">🐢</div>
        </div>
      </div>
      {/* SF nav tabs */}
      <div className="flex items-center gap-4 px-4 py-1.5 bg-[#0176D3] text-white/80 border-b border-white/10">
        <span className="text-2xs font-medium border-b border-white py-1">Home</span>
        <span className="text-2xs py-1">Accounts</span>
        <span className="text-2xs py-1">Contacts</span>
        <span className="text-2xs py-1">Opportunities</span>
        <span className="text-2xs py-1 text-white font-medium">TurtleShell</span>
      </div>
      <div className="flex min-h-[220px]">
        {/* Main content area */}
        <div className="flex-1 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-shell-500/20 flex items-center justify-center text-sm">🐢</div>
            <div>
              <p className="text-xs font-semibold text-text-primary">TurtleShell Assistant</p>
              <p className="text-2xs text-text-muted">Embedded in your Salesforce workspace</p>
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="flex gap-2">
              <div className="w-5 h-5 rounded-full bg-shell-500/20 flex-shrink-0 flex items-center justify-center text-2xs">🐢</div>
              <div className="bg-surface-2 rounded-lg rounded-tl-none px-3 py-2 max-w-[80%]">
                <p className="text-xs text-text-secondary">I can see you're viewing Acme Corp. Want me to pull their open cases and recent activity?</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <div className="bg-shell-500/10 border border-shell-500/20 rounded-lg rounded-tr-none px-3 py-2 max-w-[80%]">
                <p className="text-xs text-text-primary">Yes, and check HubSpot for their latest engagement score</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-5 h-5 rounded-full bg-shell-500/20 flex-shrink-0 flex items-center justify-center text-2xs">🐢</div>
              <div className="bg-surface-2 rounded-lg rounded-tl-none px-3 py-2 max-w-[80%]">
                <p className="text-xs text-shell-400 font-medium">3 open cases found. HubSpot score: 87/100 (Hot).</p>
                <p className="text-xs text-text-muted mt-1">Recommend scheduling a QBR this week.</p>
              </div>
            </div>
          </div>
        </div>
        {/* SF sidebar */}
        <div className="w-40 bg-surface-2/50 border-l border-border-muted p-3 space-y-3">
          <div>
            <p className="text-2xs text-text-muted font-medium mb-1.5">Account Details</p>
            <p className="text-2xs text-text-primary font-medium">Acme Corp</p>
            <p className="text-2xs text-text-muted">Enterprise</p>
          </div>
          <div>
            <p className="text-2xs text-text-muted font-medium mb-1">Open Cases</p>
            <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-400" /><span className="text-2xs text-text-muted">3 P1</span></div>
            <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400" /><span className="text-2xs text-text-muted">7 P2</span></div>
          </div>
          <div>
            <p className="text-2xs text-text-muted font-medium mb-1">MCP Tools</p>
            <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-shell-400" /><span className="text-2xs text-text-muted">Salesforce</span></div>
            <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-shell-400" /><span className="text-2xs text-text-muted">HubSpot</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

const surfaceMockups: Record<Surface, () => React.JSX.Element> = {
  web: WebMockup,
  iphone: IPhoneMockup,
  android: AndroidMockup,
  desktop: DesktopMockup,
  salesforce: SalesforceMockup,
  cli: CLIMockup,
};

const features = [
  {
    icon: '💬',
    title: 'Streaming AI Chat',
    description:
      'Real-time conversation with Athena LLM. Server-sent events deliver token-by-token responses as they\'re generated.',
  },
  {
    icon: '🔗',
    title: 'Service Registry',
    description:
      'Connect Salesforce, GitHub, HubSpot, and more with OAuth PKCE. Manage all your enterprise service connections in one place.',
  },
  {
    icon: '🤖',
    title: 'Agent System',
    description:
      'Switch between specialized AI agents. Each agent has unique capabilities and access to different connected services.',
  },
  {
    icon: '🛡️',
    title: 'MCP Protocol',
    description:
      'Model Context Protocol enables Athena to securely interact with your connected services in real-time during conversations.',
  },
  {
    icon: '⚡',
    title: 'Multi-Environment',
    description:
      'Switch between Production, Off-Grid, and Custom endpoints. Development and production in one interface.',
  },
  {
    icon: '📖',
    title: 'Documentation Viewer',
    description:
      'Browse agent documentation, API references, and integration guides without leaving the app.',
  },
];

const services = [
  { icon: '☁️', name: 'Salesforce' },
  { icon: '🐙', name: 'GitHub' },
  { icon: '🟠', name: 'HubSpot' },
  { icon: '📅', name: 'Google Calendar' },
  { icon: '💼', name: 'Workday' },
  { icon: '💬', name: 'Slack' },
];

function SupportSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const mailtoSubject = encodeURIComponent(subject || 'Support Request');
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:support@turtleshell.ai?subject=${mailtoSubject}&body=${body}`;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    }, 3000);
  };

  return (
    <section id="support" className="py-20 border-t border-border-muted">
      <div className="max-w-[1120px] mx-auto px-6">
        <h2 className="text-3xl font-bold tracking-tight text-center mb-3">
          How can we help?
        </h2>
        <p className="text-base text-text-secondary text-center mb-14">
          Send us a message or email{' '}
          <a href="mailto:support@turtleshell.ai" className="text-shell-400 hover:underline">
            support@turtleshell.ai
          </a>
        </p>

        <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-2xs text-text-muted block mb-1">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2.5 bg-surface-2 border border-border-muted rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-400 transition-colors"
              />
            </div>
            <div>
              <label className="text-2xs text-text-muted block mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-3 py-2.5 bg-surface-2 border border-border-muted rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-400 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-2xs text-text-muted block mb-1">Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What do you need help with?"
              className="w-full px-3 py-2.5 bg-surface-2 border border-border-muted rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-400 transition-colors"
            />
          </div>

          <div>
            <label className="text-2xs text-text-muted block mb-1">Message</label>
            <textarea
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue or question..."
              className="w-full px-3 py-2.5 bg-surface-2 border border-border-muted rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-400 transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitted}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-shell-500 text-white text-sm font-semibold rounded-lg hover:bg-shell-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-shell-500/30"
          >
            {submitted ? 'Opening email client...' : 'Send Support Request'}
          </button>
        </form>
      </div>
    </section>
  );
}

export function Landing() {
  const [surface, setSurface] = useState<Surface>('web');
  const Mockup = surfaceMockups[surface];

  return (
    <>
      {/* Hero */}
      <section className="pt-24 pb-20 text-center">
        <div className="max-w-[1120px] mx-auto px-6">
          <a
            href="https://github.com/olympus-616/foundation"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface-2 border border-border rounded-full text-xs text-text-secondary hover:text-text-primary hover:border-shell-400/40 transition-colors mb-8"
          >
            <div className="w-1.5 h-1.5 bg-shell-400 rounded-full animate-pulse-dot" />
            <span>Powered by Athena LLM on Olympus-Grid</span>
          </a>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tighter leading-none mb-6">
            Your{' '}
            <span className="bg-gradient-to-br from-shell-400 via-lime-400 to-shell-500 bg-clip-text text-transparent">
              sovereign AI
            </span>
            <br />
            assistant.
          </h1>

          <p className="text-lg text-text-secondary max-w-xl mx-auto mb-10 leading-relaxed">
            One AI that surfaces everywhere you work. Open source. Fully sovereign.
            Self-host it, use our cloud, or both — always free to start, always yours.
          </p>

          <p className="text-sm text-text-muted mb-6">Choose your surface</p>

          {/* Surface tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {surfaces.map((s) => (
              <button
                key={s.id}
                onClick={() => setSurface(s.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  surface === s.id
                    ? 'bg-shell-500 text-white shadow-lg shadow-shell-500/20'
                    : 'bg-surface-2 border border-border-muted text-text-secondary hover:bg-surface-3 hover:text-text-primary'
                }`}
              >
                <span>{s.icon}</span>
                {s.label}
                {s.badge && (
                  <span className={`text-2xs font-medium px-1.5 py-0.5 rounded-full ${
                    surface === s.id
                      ? 'bg-white/20 text-white'
                      : 'bg-surface-3 text-text-muted'
                  }`}>
                    {s.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Surface mockup */}
          <div className="max-w-2xl mx-auto" style={{ perspective: '1000px' }}>
            <div
              className="transition-transform duration-300 hover:[transform:rotateX(0deg)]"
              style={{ transform: 'rotateX(2deg)' }}
            >
              <Mockup />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-[1120px] mx-auto px-6">
          <h2 className="text-3xl font-bold tracking-tight text-center mb-3">
            Built for the enterprise stack.
          </h2>
          <p className="text-base text-text-secondary text-center mb-14">
            Every feature from the iOS app, now in your browser.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-surface-1 border border-border-muted rounded-xl p-7 transition-all duration-200 hover:border-border hover:bg-surface-2 hover:-translate-y-0.5"
              >
                <div className="w-10 h-10 bg-surface-3 border border-border rounded-lg flex items-center justify-center text-lg mb-4">
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold mb-2 tracking-tight">{f.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services strip */}
      <section id="services" className="py-16 border-t border-b border-border-muted">
        <div className="max-w-[1120px] mx-auto px-6">
          <h3 className="text-center text-xs uppercase tracking-widest font-medium text-text-muted mb-8">
            Connects to your tools
          </h3>
          <div className="flex items-center justify-center gap-12 flex-wrap">
            {services.map((s) => (
              <div
                key={s.name}
                className="flex items-center gap-2.5 text-text-muted text-sm font-medium hover:text-text-secondary transition-colors"
              >
                <div className="w-8 h-8 bg-surface-2 rounded-lg flex items-center justify-center text-base">
                  {s.icon}
                </div>
                {s.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-[1120px] mx-auto px-6">
          <h2 className="text-3xl font-bold tracking-tight text-center mb-3">
            Simple, transparent pricing.
          </h2>
          <p className="text-base text-text-secondary text-center mb-14">
            Start free. Scale when you're ready.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {/* Free */}
            <div className="bg-surface-1 border border-border-muted rounded-xl p-7 flex flex-col">
              <h3 className="text-base font-semibold tracking-tight mb-1">Free</h3>
              <p className="text-sm text-text-muted mb-4">For individuals getting started</p>
              <div className="mb-6">
                <span className="text-4xl font-bold tracking-tight">$0</span>
                <span className="text-sm text-text-muted">/mo</span>
              </div>
              <ul className="space-y-2.5 text-sm text-text-secondary mb-8 flex-1">
                <li className="flex items-start gap-2"><span className="text-shell-400 mt-0.5">&#10003;</span>AI chat with Athena</li>
                <li className="flex items-start gap-2"><span className="text-shell-400 mt-0.5">&#10003;</span>2 service connections</li>
                <li className="flex items-start gap-2"><span className="text-shell-400 mt-0.5">&#10003;</span>Community support</li>
              </ul>
              <Link
                to="/app/chat"
                className="w-full text-center px-4 py-2.5 rounded-lg text-sm font-semibold border border-border text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-all"
              >
                Get Started
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-surface-1 border-2 border-shell-500 rounded-xl p-7 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-shell-500 text-white text-2xs font-semibold rounded-full">
                Popular
              </div>
              <h3 className="text-base font-semibold tracking-tight mb-1">Pro</h3>
              <p className="text-sm text-text-muted mb-4">For professionals &amp; teams</p>
              <div className="mb-6">
                <span className="text-4xl font-bold tracking-tight">$29</span>
                <span className="text-sm text-text-muted">/mo</span>
              </div>
              <ul className="space-y-2.5 text-sm text-text-secondary mb-8 flex-1">
                <li className="flex items-start gap-2"><span className="text-shell-400 mt-0.5">&#10003;</span>Unlimited AI chat</li>
                <li className="flex items-start gap-2"><span className="text-shell-400 mt-0.5">&#10003;</span>Unlimited service connections</li>
                <li className="flex items-start gap-2"><span className="text-shell-400 mt-0.5">&#10003;</span>All agents &amp; MCP tools</li>
                <li className="flex items-start gap-2"><span className="text-shell-400 mt-0.5">&#10003;</span>Priority support</li>
              </ul>
              <Link
                to="/app/chat"
                className="w-full text-center px-4 py-2.5 rounded-lg text-sm font-semibold bg-shell-500 text-white hover:bg-shell-600 transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-shell-500/30"
              >
                Start Pro Trial
              </Link>
            </div>

            {/* Enterprise */}
            <div className="bg-surface-1 border border-border-muted rounded-xl p-7 flex flex-col">
              <h3 className="text-base font-semibold tracking-tight mb-1">Enterprise</h3>
              <p className="text-sm text-text-muted mb-4">For organizations at scale</p>
              <div className="mb-6">
                <span className="text-4xl font-bold tracking-tight">Custom</span>
              </div>
              <ul className="space-y-2.5 text-sm text-text-secondary mb-8 flex-1">
                <li className="flex items-start gap-2"><span className="text-shell-400 mt-0.5">&#10003;</span>Everything in Pro</li>
                <li className="flex items-start gap-2"><span className="text-shell-400 mt-0.5">&#10003;</span>SSO &amp; SCIM provisioning</li>
                <li className="flex items-start gap-2"><span className="text-shell-400 mt-0.5">&#10003;</span>Dedicated infrastructure</li>
                <li className="flex items-start gap-2"><span className="text-shell-400 mt-0.5">&#10003;</span>SLA &amp; dedicated support</li>
              </ul>
              <a
                href="mailto:support@turtleshell.ai?subject=Enterprise%20Inquiry"
                className="w-full text-center px-4 py-2.5 rounded-lg text-sm font-semibold border border-border text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-all"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Support */}
      <SupportSection />

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="relative bg-gradient-to-br from-surface-1 to-surface-2 border border-border rounded-2xl px-10 py-16 text-center overflow-hidden">
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-3/5 h-px"
              style={{
                background: 'linear-gradient(90deg, transparent, var(--color-shell-500, #22c55e), transparent)',
              }}
            />
            <h2 className="text-2xl font-bold tracking-tight mb-3">
              Ready to connect your stack?
            </h2>
            <p className="text-base text-text-secondary mb-8">
              TurtleShell.ai is free to get started. Connect your first service in under a minute.
            </p>
            <Link
              to="/app/chat"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-shell-500 text-white hover:bg-shell-600 transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-shell-500/30"
            >
              Launch TurtleShell →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
