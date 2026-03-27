import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useState } from 'react';

/* ================================================================ */
/* Accordion helper                                                  */
/* ================================================================ */
function Section({ title, children, defaultOpen }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border border-border-muted rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-surface-1 hover:bg-surface-2 transition-colors text-left"
      >
        <span className="text-sm font-semibold flex-1">{title}</span>
        <ChevronDown size={14} className={`text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 py-4 border-t border-border-muted text-sm text-text-secondary leading-relaxed space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link to="/app/docs" className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors mb-6 no-underline">
      <ArrowLeft size={14} />
      {label}
    </Link>
  );
}

/* ================================================================ */
/* Landing page — topic cards                                        */
/* ================================================================ */
const TOPICS = [
  {
    path: 'getting-started',
    icon: '🚀',
    title: 'Getting Started',
    description: 'What is TurtleShell? How does it work? Start here.',
  },
  {
    path: 'how-ai-works',
    icon: '🧠',
    title: 'How AI Works',
    description: 'What is an LLM? How does it think? A simple explanation.',
  },
  {
    path: 'agents',
    icon: '🤖',
    title: 'AI Agents',
    description: 'What are agents? How do they connect? What can they do?',
  },
  {
    path: 'security',
    icon: '🔐',
    title: 'Security & Privacy',
    description: 'How your data stays private. Encryption explained simply.',
  },
  {
    path: 'building',
    icon: '🔧',
    title: 'Build Your Own Agent',
    description: 'Create your first cosmos-logos agent step by step.',
  },
  {
    path: 'glossary',
    icon: '📖',
    title: 'Glossary',
    description: 'Key terms explained in plain language.',
  },
];

function DocsLanding() {
  const navigate = useNavigate();
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Learn</h1>
        <p className="text-sm text-text-muted mt-1">
          Understand how TurtleShell, AI agents, and the cosmos-logos protocol work — explained so anyone can follow along.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {TOPICS.map((topic) => (
          <button
            key={topic.path}
            onClick={() => navigate(topic.path)}
            className="p-5 bg-surface-1 border border-border-muted rounded-xl hover:border-border hover:bg-surface-2 transition-colors text-left group"
          >
            <span className="text-2xl block mb-3">{topic.icon}</span>
            <h3 className="text-sm font-semibold mb-1 group-hover:text-shell-400 transition-colors">{topic.title}</h3>
            <p className="text-2xs text-text-muted leading-relaxed">{topic.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ================================================================ */
/* Getting Started                                                    */
/* ================================================================ */
function GettingStarted() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <BackLink label="Back to Learn" />
      <h1 className="text-2xl font-bold">🚀 Getting Started</h1>
      <p className="text-text-secondary">
        TurtleShell is like a home screen for your AI assistants. Instead of going to different
        websites for different AI tools, TurtleShell brings them all together in one place —
        and you control everything.
      </p>

      <Section title="What is TurtleShell?" defaultOpen>
        <p>
          Think of TurtleShell like a <strong>phone for AI agents</strong>. Your phone has apps —
          TurtleShell has agents. Each agent is a specialist: one helps with homework, another
          manages your family projects, another writes stories.
        </p>
        <p>
          The difference from regular apps? <strong>You own everything.</strong> The agents run
          on your own computer (or your family's server). Your conversations, files, and data
          never leave your control.
        </p>
      </Section>

      <Section title="How do I use it?">
        <ol className="list-decimal list-inside space-y-2 text-text-muted">
          <li><strong className="text-text-secondary">Chat</strong> — Talk to your AI assistant just like texting a friend. Ask questions, get help, brainstorm ideas.</li>
          <li><strong className="text-text-secondary">Agents</strong> — Connect specialized AI agents from the sidebar. Each one has different skills.</li>
          <li><strong className="text-text-secondary">Agent Setup</strong> — Add new agents by pasting a URL or GitHub link. The agent introduces itself and connects automatically.</li>
          <li><strong className="text-text-secondary">Settings</strong> — Choose dark or light mode, configure developer options, and manage your preferences.</li>
        </ol>
      </Section>

      <Section title="What agents are available?">
        <p>Right now, three agents are ready to connect:</p>
        <ul className="list-disc list-inside space-y-2 text-text-muted">
          <li><strong className="text-text-secondary">Homework Buddy</strong> — An AI tutor for students ages 10–17. It helps with homework without just giving answers.</li>
          <li><strong className="text-text-secondary">Agora</strong> — A group collaboration tool. Create projects, chat with your team, and let AI help manage everything.</li>
          <li><strong className="text-text-secondary">Thoth</strong> — A writing and coding agent. Keep a journal, write stories, and get editorial feedback from AI.</li>
        </ul>
      </Section>
    </div>
  );
}

/* ================================================================ */
/* How AI Works                                                       */
/* ================================================================ */
function HowAIWorks() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <BackLink label="Back to Learn" />
      <h1 className="text-2xl font-bold">🧠 How AI Works</h1>
      <p className="text-text-secondary">
        AI can seem like magic, but it's actually built on simple ideas. Here's how it works,
        explained so you could teach it to a friend.
      </p>

      <Section title="What is an LLM?" defaultOpen>
        <p>
          <strong>LLM</strong> stands for <strong>Large Language Model</strong>. It's a computer
          program that has read billions of pages of text — books, articles, websites, code —
          and learned patterns in how humans write.
        </p>
        <p>
          When you ask it a question, it doesn't "look up" the answer. Instead, it predicts
          what words should come next, based on all the patterns it learned. It's like the
          world's best autocomplete — but instead of finishing one word, it finishes entire
          paragraphs.
        </p>
      </Section>

      <Section title="How does TurtleShell talk to AI?">
        <p>
          TurtleShell doesn't have its own AI brain. Instead, it connects to AI services
          (like OpenAI, Claude, Grok, or Gemini) and sends your message to them. The AI
          thinks about it and sends back a response. TurtleShell is the messenger — you
          choose which AI brain to talk to.
        </p>
      </Section>

      <Section title="What about privacy?">
        <p>
          When you use most AI websites, your conversations are stored on their servers.
          With TurtleShell and cosmos-logos agents, the goal is different:
        </p>
        <ul className="list-disc list-inside space-y-1 text-text-muted">
          <li>Your agents run on <strong className="text-text-secondary">your own computer</strong></li>
          <li>Conversations are stored <strong className="text-text-secondary">locally</strong>, not in someone else's cloud</li>
          <li>Sensitive data (like passwords or tokens) is <strong className="text-text-secondary">encrypted</strong> so only the right agent can read it</li>
        </ul>
      </Section>

      <Section title="Can AI make mistakes?">
        <p>
          Yes! AI is confident but not always correct. It can "hallucinate" — make up facts
          that sound real but aren't. Always double-check important information, especially
          for homework or school projects. Think of AI as a smart friend who sometimes
          guesses wrong.
        </p>
      </Section>
    </div>
  );
}

/* ================================================================ */
/* Agents                                                             */
/* ================================================================ */
function AgentsDocs() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <BackLink label="Back to Learn" />
      <h1 className="text-2xl font-bold">🤖 AI Agents</h1>
      <p className="text-text-secondary">
        Agents are like apps on your phone — but instead of being made by big companies
        and locked to their platform, anyone can build one, and you choose which ones to install.
      </p>

      <Section title="What is an agent?" defaultOpen>
        <p>
          An agent is a small program that does something specific. Homework Buddy helps
          with schoolwork. Thoth helps with writing. Agora helps teams collaborate.
          Each agent has its own skills, its own data, and its own identity.
        </p>
        <p>
          Agents are <strong>sovereign</strong> — that means they run on their own and
          don't need permission from anyone. They can run on your laptop, a Raspberry Pi,
          or a server in the cloud. You decide where.
        </p>
      </Section>

      <Section title="How does TurtleShell find agents?">
        <p>
          Every agent publishes a small file called a <strong>manifest</strong> at a
          special URL. It's like an ID card that says:
        </p>
        <ul className="list-disc list-inside space-y-1 text-text-muted">
          <li>"My name is Homework Buddy"</li>
          <li>"I can help with tutoring and assignments"</li>
          <li>"Here's my public key so you can send me encrypted messages"</li>
          <li>"Connect to me at this address"</li>
        </ul>
        <p>
          TurtleShell reads this manifest and knows exactly what the agent can do. No
          app store needed — just a URL.
        </p>
      </Section>

      <Section title="The cosmos-logos protocol">
        <p>
          <strong>cosmos-logos</strong> is the name of the system that makes all this work.
          It's a set of rules that agents follow so they can discover each other, prove
          their identity, and communicate securely.
        </p>
        <p>Think of it like this:</p>
        <ul className="list-disc list-inside space-y-1 text-text-muted">
          <li><strong className="text-text-secondary">Discovery</strong> — how agents introduce themselves (the manifest file)</li>
          <li><strong className="text-text-secondary">Identity</strong> — how agents prove who they are (cryptographic keys)</li>
          <li><strong className="text-text-secondary">Communication</strong> — how agents talk securely (encrypted messages)</li>
          <li><strong className="text-text-secondary">Trust</strong> — how agents decide who to trust (signed requests)</li>
        </ul>
      </Section>

      <Section title="Two types of agents">
        <p>Agents show up in TurtleShell in two ways:</p>
        <div className="space-y-2">
          <div className="bg-surface-2 rounded-lg p-3">
            <div className="text-xs font-semibold text-text-primary mb-1">App agents (with a UI)</div>
            <div className="text-text-muted text-xs">
              These have their own screen — like Homework Buddy's assignment tracker or Agora's
              group chat. They appear in the sidebar and load in an embedded view.
            </div>
          </div>
          <div className="bg-surface-2 rounded-lg p-3">
            <div className="text-xs font-semibold text-text-primary mb-1">Chat agents (voice only)</div>
            <div className="text-text-muted text-xs">
              These add a new AI voice to your chat — like Athena, which connects to multiple
              AI providers. They appear in the agent picker dropdown but don't have their own page.
            </div>
          </div>
        </div>
      </Section>

      <Section title="The manifest file (technical detail)">
        <p>
          For those who want to peek under the hood: the manifest is a JSON file at{' '}
          <code className="text-shell-400 bg-surface-2 px-1.5 py-0.5 rounded text-xs font-mono">
            /.well-known/cosmos-logos.json
          </code>
        </p>
        <p>It contains sections for:</p>
        <div className="bg-surface-2 rounded-lg p-3 font-mono text-xs text-text-muted space-y-1">
          <div><span className="text-shell-400">identity</span> — who the agent is (name, version, purpose)</div>
          <div><span className="text-shell-400">display</span> — how it looks (color, icon, embedded URL)</div>
          <div><span className="text-shell-400">network</span> — where to reach it (endpoint, health check)</div>
          <div><span className="text-shell-400">cryptography</span> — its public key for secure messaging</div>
          <div><span className="text-shell-400">capabilities</span> — what it can do (chat, tutoring, etc.)</div>
          <div><span className="text-shell-400">setup</span> — configuration fields for install time</div>
        </div>
      </Section>
    </div>
  );
}

/* ================================================================ */
/* Security                                                           */
/* ================================================================ */
function SecurityDocs() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <BackLink label="Back to Learn" />
      <h1 className="text-2xl font-bold">🔐 Security & Privacy</h1>
      <p className="text-text-secondary">
        How TurtleShell keeps your data safe — explained without the jargon.
      </p>

      <Section title="The locked mailbox analogy" defaultOpen>
        <p>
          Imagine every agent has a <strong>locked mailbox</strong>. The agent published
          the address of the mailbox and gave everyone a copy of the lock — that's the
          <strong> public key</strong>. Anyone can put a letter in the mailbox and lock it.
        </p>
        <p>
          But only the agent has the <strong>key that opens the mailbox</strong> — that's
          the <strong>private key</strong>. Even the person who put the letter in can't
          get it back out. Only the agent can read it.
        </p>
        <p>
          This is exactly how <strong>sealed envelope encryption</strong> works in cosmos-logos.
        </p>
      </Section>

      <Section title="How a sealed envelope works">
        <p>When TurtleShell needs to send something private to an agent (like an access token):</p>
        <ol className="list-decimal list-inside space-y-2 text-text-muted">
          <li><strong className="text-text-secondary">Seal</strong> — TurtleShell puts the secret in an envelope and locks it with the agent's public key. After locking, even TurtleShell can't open it.</li>
          <li><strong className="text-text-secondary">Sign</strong> — TurtleShell stamps the envelope with its own signature so the agent knows who sent it.</li>
          <li><strong className="text-text-secondary">Send</strong> — The locked envelope travels over the internet. Anyone who intercepts it sees gibberish.</li>
          <li><strong className="text-text-secondary">Open</strong> — The agent uses its private key (which never leaves the agent's computer) to unlock and read the secret.</li>
          <li><strong className="text-text-secondary">Prove</strong> — The agent creates a fingerprint of what it read and sends it back. TurtleShell checks the fingerprint matches — proof the agent read the right thing, without the secret ever being sent back.</li>
        </ol>
      </Section>

      <Section title="Why is the private key so important?">
        <p>
          The private key is like the only key to a safe. It <strong>never leaves the agent's
          computer</strong>. It's never sent over the internet, never shared, never uploaded.
          If someone stole the agent's computer, they'd need the private key file to pretend
          to be that agent.
        </p>
        <p>
          When you add an agent in TurtleShell, the first thing it does is test this system —
          it sends a sealed message and checks that the agent can open it. If the agent can't
          prove it has the right private key, TurtleShell refuses to connect.
        </p>
      </Section>

      <Section title="What data stays private?">
        <ul className="list-disc list-inside space-y-1 text-text-muted">
          <li><strong className="text-text-secondary">Your conversations</strong> — stored on your machine, not in someone else's cloud</li>
          <li><strong className="text-text-secondary">Your tokens and passwords</strong> — encrypted end-to-end using sealed envelopes</li>
          <li><strong className="text-text-secondary">Agent private keys</strong> — never leave the agent's computer</li>
          <li><strong className="text-text-secondary">Your theme, settings, preferences</strong> — stored in your browser's local storage</li>
        </ul>
      </Section>

      <Section title="Testing it yourself">
        <p>
          If you're a developer, you can see all of this in action. Go to{' '}
          <strong>Settings → Developer Mode</strong>, then open <strong>Agent Setup</strong>.
          Each connected agent has a shield icon — click it to run the sealed envelope test
          and watch the cryptographic handshake happen in real time.
        </p>
      </Section>
    </div>
  );
}

/* ================================================================ */
/* Build Your Own Agent                                               */
/* ================================================================ */
function BuildingDocs() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <BackLink label="Back to Learn" />
      <h1 className="text-2xl font-bold">🔧 Build Your Own Agent</h1>
      <p className="text-text-secondary">
        You can create your own AI agent and connect it to TurtleShell. Here's the minimum you need.
      </p>

      <Section title="Step 1: Create the manifest" defaultOpen>
        <p>
          Create a file called <code className="text-shell-400 bg-surface-2 px-1 py-0.5 rounded text-xs font-mono">cosmos-logos.json</code> and
          serve it at <code className="text-shell-400 bg-surface-2 px-1 py-0.5 rounded text-xs font-mono">/.well-known/cosmos-logos.json</code> on
          your web server. This is your agent's ID card.
        </p>
      </Section>

      <Section title="Step 2: Generate your keys">
        <p>
          Run this command to create your Ed25519 keypair:
        </p>
        <div className="bg-surface-2 rounded-lg p-3 font-mono text-xs text-text-muted">
          openssl genpkey -algorithm Ed25519 -out my-agent.key<br />
          openssl pkey -in my-agent.key -pubout -out my-agent.pub
        </div>
        <p>
          Put the public key in your manifest. Keep the private key safe — never commit it to git.
        </p>
      </Section>

      <Section title="Step 3: Add the verify endpoint">
        <p>
          Implement <code className="text-shell-400 bg-surface-2 px-1 py-0.5 rounded text-xs font-mono">POST /api/cosmos/verify-envelope</code>.
          This endpoint receives a sealed message, decrypts it with your private key, and returns a SHA-256 hash as proof.
          TurtleShell tests this during connection — if it fails, the agent is rejected.
        </p>
      </Section>

      <Section title="Step 4: Add the theme bridge (optional)">
        <p>
          If your agent has a web UI, include the shell-theme.js script so it automatically
          matches TurtleShell's dark/light mode. It reads a URL parameter and listens for
          postMessage events from the parent shell.
        </p>
      </Section>

      <Section title="Step 5: Connect and test">
        <p>
          Start your agent, open TurtleShell, go to Agent Setup, and paste your agent's URL.
          TurtleShell will fetch the manifest, verify the cryptographic handshake, and connect.
        </p>
      </Section>
    </div>
  );
}

/* ================================================================ */
/* Glossary                                                           */
/* ================================================================ */
const TERMS = [
  ['Agent', 'A small program with specific AI skills that connects to TurtleShell. Like an app on your phone.'],
  ['cosmos-logos', 'The protocol (set of rules) that agents use to discover each other and communicate securely.'],
  ['Ed25519', 'A type of cryptographic key used for signing and encryption. Fast, secure, and widely used.'],
  ['Envelope', 'An encrypted message that only the intended recipient can open.'],
  ['LLM', 'Large Language Model — an AI trained on text that can understand and generate human language.'],
  ['Manifest', 'A JSON file that describes an agent\'s identity, capabilities, and connection details.'],
  ['MCP', 'Model Context Protocol — lets AI access external tools and data sources.'],
  ['Private key', 'A secret key that only the owner has. Used to decrypt messages and prove identity. Never shared.'],
  ['Public key', 'A key shared with everyone. Used to encrypt messages that only the private key holder can read.'],
  ['Sealed box', 'An encryption method where even the sender can\'t read the message after sealing it.'],
  ['SHA-256', 'A fingerprint of data. Same input always gives the same fingerprint. Used to prove you read something without revealing it.'],
  ['Shell', 'TurtleShell — the host application that connects to and manages agents.'],
  ['Sovereign', 'Self-owned and self-controlled. No central authority required.'],
  ['Token', 'A temporary password that lets a program access a service (like Google or GitHub) on your behalf.'],
];

function GlossaryDocs() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <BackLink label="Back to Learn" />
      <h1 className="text-2xl font-bold">📖 Glossary</h1>
      <p className="text-text-secondary">Key terms explained in plain language.</p>

      <div className="bg-surface-1 border border-border-muted rounded-xl divide-y divide-border-muted">
        {TERMS.map(([term, def]) => (
          <div key={term} className="px-5 py-3">
            <span className="text-sm font-semibold">{term}</span>
            <p className="text-2xs text-text-muted mt-0.5">{def}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================ */
/* Router                                                             */
/* ================================================================ */
export function Docs() {
  return (
    <div className="flex-1 overflow-y-auto">
      <Routes>
        <Route index element={<DocsLanding />} />
        <Route path="getting-started" element={<GettingStarted />} />
        <Route path="how-ai-works" element={<HowAIWorks />} />
        <Route path="agents" element={<AgentsDocs />} />
        <Route path="security" element={<SecurityDocs />} />
        <Route path="building" element={<BuildingDocs />} />
        <Route path="glossary" element={<GlossaryDocs />} />
      </Routes>
    </div>
  );
}
