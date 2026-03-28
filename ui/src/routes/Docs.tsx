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
/* Athena                                                             */
/* ================================================================ */
function AthenaDocs() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <BackLink label="Back to Learn" />
      <div className="flex items-center gap-3">
        <span className="text-3xl">🦉</span>
        <div>
          <h1 className="text-2xl font-bold">Athena</h1>
          <p className="text-sm text-text-muted">Multi-provider LLM gateway — the intelligence layer of Olympus-616</p>
        </div>
      </div>

      <Section title="What is Athena?" defaultOpen>
        <p>
          <strong>Athena</strong> is the AI brain that sits behind TurtleShell. When you send a message
          to any agent — Logos, Cosmos, a custom agent, or Athena herself — it's Athena that talks
          to the actual LLM (GPT-4, Claude, Grok, Gemini, or a local model).
        </p>
        <p>
          Think of Athena as a <strong>smart switchboard</strong>. She receives your message, decides which
          AI provider to use, attaches the right tools (MCP), injects the agent's personality (system prompt),
          and streams the response back — all in real time.
        </p>
        <p>
          Without Athena, the other agents have no voice. With Athena, they can speak through any AI
          provider in the world.
        </p>
      </Section>

      <Section title="How does Athena choose which model to use?">
        <p>Athena routes your message based on the <strong>agent you selected</strong>:</p>
        <ul className="list-disc list-inside space-y-1 text-text-muted">
          <li><strong className="text-text-secondary">Logos / Cosmos</strong> → Local model (Ollama) — free, fast, runs on your machine</li>
          <li><strong className="text-text-secondary">Athena (any variant)</strong> → OpenAI GPT-4o — cloud-powered intelligence</li>
          <li><strong className="text-text-secondary">Custom agents</strong> → Whichever model Athena is configured to use</li>
        </ul>
        <p>
          The system prompt from the agent's <code className="text-shell-400 bg-surface-2 px-1 py-0.5 rounded text-xs">cosmos-logos.json</code> manifest
          defines the personality. Athena is the messenger — the manifest is the soul.
        </p>
      </Section>

      <Section title="Three ways to run Athena">
        <div className="space-y-3">
          <div className="bg-surface-2 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span>☁️</span>
              <span className="text-xs font-semibold" style={{ color: '#C9A84C' }}>#athena — Olympus-Grid</span>
            </div>
            <p className="text-text-muted text-xs">
              Hosted on AWS by CloudPremise. Zero setup — just subscribe to Sea Shells and connect.
              This is the fastest way to get started. Your messages route through our secure infrastructure
              to the best available AI provider.
            </p>
            <p className="text-text-muted text-xs mt-1">
              <strong className="text-text-secondary">Best for:</strong> Users who want instant AI access without running anything locally.
            </p>
          </div>

          <div className="bg-surface-2 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span>🔧</span>
              <span className="text-xs font-semibold" style={{ color: '#8B5CF6' }}>#athena-616 — Developer</span>
            </div>
            <p className="text-text-muted text-xs">
              Run the full Olympus-616 stack on your development machine. Expose it via ngrok for remote access.
              You control the API keys, the model selection, and the MCP tool connections.
            </p>
            <p className="text-text-muted text-xs mt-1">
              <strong className="text-text-secondary">Best for:</strong> Developers building agents, testing integrations, or contributing to Olympus-616.
            </p>
          </div>

          <div className="bg-surface-2 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span>🐢</span>
              <span className="text-xs font-semibold" style={{ color: '#10B981' }}>#athena-offgrid — Off-Grid</span>
            </div>
            <p className="text-text-muted text-xs">
              Install TurtleShell Off-Grid on a Mac Mini, Raspberry Pi, or any machine. Athena runs
              inside the Docker fleet on port 3401, accessible through the port 717 reverse proxy.
              Connect via Tailscale from your phone — your AI runs on your hardware, your network, your rules.
            </p>
            <p className="text-text-muted text-xs mt-1">
              <strong className="text-text-secondary">Best for:</strong> Privacy-first users who want sovereign AI infrastructure they fully control.
            </p>
          </div>
        </div>
      </Section>

      <Section title="What can Athena do?">
        <ul className="list-disc list-inside space-y-1 text-text-muted">
          <li><strong className="text-text-secondary">Chat</strong> — Streaming conversation with any LLM provider</li>
          <li><strong className="text-text-secondary">MCP Tools</strong> — When Poseidon is connected, Athena gains 34+ tools for Salesforce, Google, GitHub, HubSpot, Workday, and more</li>
          <li><strong className="text-text-secondary">Memory</strong> — Mnemosyne integration for conversation history and context</li>
          <li><strong className="text-text-secondary">Voice</strong> — When Apollo is connected, Athena's responses can be spoken aloud with per-agent voice identity</li>
          <li><strong className="text-text-secondary">System Prompts</strong> — Each agent's personality is injected from its cosmos-logos manifest</li>
        </ul>
      </Section>

      <Section title="Host your own Athena" defaultOpen>
        <p>
          Running your own Athena gives you full control over which AI providers, API keys, and MCP tools
          your agents use. Here's how to get started:
        </p>

        <div className="space-y-4 mt-3">
          <div>
            <h4 className="text-xs font-semibold text-text-secondary mb-1">1. Prerequisites</h4>
            <ul className="list-disc list-inside space-y-1 text-text-muted text-xs">
              <li><strong className="text-text-secondary">Node.js 18+</strong> and <strong className="text-text-secondary">npm</strong></li>
              <li>An API key from at least one LLM provider (OpenAI, Anthropic, xAI, or Google)</li>
              <li><strong className="text-text-secondary">ngrok</strong> (free tier works) — to expose your local Athena to the internet</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-text-secondary mb-1">2. Clone &amp; install</h4>
            <div className="bg-surface-2 rounded-lg p-3 font-mono text-xs text-text-muted space-y-1">
              <div>git clone https://github.com/olympus-616/athena.git</div>
              <div>cd athena/api</div>
              <div>npm install</div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-text-secondary mb-1">3. Configure your environment</h4>
            <p className="text-text-muted text-xs mb-2">
              Copy <code className="text-shell-400 bg-surface-2 px-1 py-0.5 rounded text-xs">.env.example</code> to <code className="text-shell-400 bg-surface-2 px-1 py-0.5 rounded text-xs">.env</code> and
              add your provider keys:
            </p>
            <div className="bg-surface-2 rounded-lg p-3 font-mono text-xs text-text-muted space-y-1">
              <div><span className="text-shell-400">OPENAI_API_KEY</span>=sk-...</div>
              <div><span className="text-shell-400">ANTHROPIC_API_KEY</span>=sk-ant-...</div>
              <div><span className="text-shell-400">XAI_API_KEY</span>=xai-...</div>
              <div><span className="text-shell-400">GEMINI_API_KEY</span>=AI...</div>
            </div>
            <p className="text-text-muted text-xs mt-1">You only need one provider — Athena will use whatever keys are present.</p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-text-secondary mb-1">4. Generate your Ed25519 keypair</h4>
            <p className="text-text-muted text-xs mb-2">
              Athena uses Ed25519 keys for the cosmos-logos sealed envelope handshake. Generate a keypair:
            </p>
            <div className="bg-surface-2 rounded-lg p-3 font-mono text-xs text-text-muted space-y-1">
              <div>openssl genpkey -algorithm Ed25519 -out athena.key</div>
              <div>openssl pkey -in athena.key -pubout -out athena.pub</div>
            </div>
            <p className="text-text-muted text-xs mt-1">
              Place the key in your preferred location and set <code className="text-shell-400 bg-surface-2 px-1 py-0.5 rounded text-xs">ED25519_PRIVATE_KEY_PATH</code> in your <code className="text-shell-400 bg-surface-2 px-1 py-0.5 rounded text-xs">.env</code>.
              The public key is embedded in your <code className="text-shell-400 bg-surface-2 px-1 py-0.5 rounded text-xs">cosmos-logos.json</code> manifest automatically.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-text-secondary mb-1">5. Start Athena</h4>
            <div className="bg-surface-2 rounded-lg p-3 font-mono text-xs text-text-muted">
              npm run dev
            </div>
            <p className="text-text-muted text-xs mt-1">
              Athena starts on port <strong className="text-text-secondary">3401</strong> by default. You should see the cosmos-logos manifest
              at <code className="text-shell-400 bg-surface-2 px-1 py-0.5 rounded text-xs">http://localhost:3401/.well-known/cosmos-logos.json</code>.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-text-secondary mb-1">6. Expose with ngrok</h4>
            <div className="bg-surface-2 rounded-lg p-3 font-mono text-xs text-text-muted space-y-1">
              <div>ngrok http 3401</div>
            </div>
            <p className="text-text-muted text-xs mt-1">
              Copy the <code className="text-shell-400 bg-surface-2 px-1 py-0.5 rounded text-xs">https://your-subdomain.ngrok.io</code> URL.
              If you have a paid ngrok plan, use a custom subdomain for a stable address:
            </p>
            <div className="bg-surface-2 rounded-lg p-3 font-mono text-xs text-text-muted mt-1">
              ngrok http 3401 --url=my-athena.ngrok.io
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-text-secondary mb-1">7. Connect from TurtleShell</h4>
            <p className="text-text-muted text-xs">
              Go to <strong className="text-text-secondary">Agent Setup</strong> → <strong className="text-text-secondary">Build your own #athena</strong>.
              Give your Athena a name (e.g. <code className="text-shell-400 bg-surface-2 px-1 py-0.5 rounded text-xs">my-athena</code>),
              paste your ngrok URL with <code className="text-shell-400 bg-surface-2 px-1 py-0.5 rounded text-xs">/v1/athena</code> appended, and click <strong className="text-text-secondary">Connect</strong>.
              TurtleShell will discover the cosmos-logos manifest, perform the encrypted handshake, and your Athena appears in the sidebar.
            </p>
          </div>

          <div className="bg-shell-500/5 border border-shell-500/20 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-shell-400 mb-1">Optional: Add companion services</h4>
            <p className="text-text-muted text-xs">
              Athena becomes more powerful with the rest of the Olympus-616 stack:
            </p>
            <ul className="list-disc list-inside space-y-1 text-text-muted text-xs mt-1">
              <li><strong className="text-text-secondary">Poseidon</strong> — MCP tool server (Salesforce, Google, GitHub, 34+ integrations)</li>
              <li><strong className="text-text-secondary">Apollo</strong> — Text-to-speech with per-agent voice identity</li>
              <li><strong className="text-text-secondary">Mnemosyne</strong> — Conversation memory and context persistence</li>
              <li><strong className="text-text-secondary">Hermes</strong> — API gateway and authentication layer</li>
            </ul>
            <p className="text-text-muted text-xs mt-1">
              Each service is its own cosmos-logos agent. Connect them individually as you need them.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Technical details">
        <div className="bg-surface-2 rounded-lg p-3 font-mono text-xs text-text-muted space-y-1">
          <div><span className="text-shell-400">Framework:</span> Express.js (TypeScript)</div>
          <div><span className="text-shell-400">Port:</span> 3401</div>
          <div><span className="text-shell-400">Providers:</span> OpenAI, Anthropic Claude, xAI Grok, Google Gemini, Ollama (local)</div>
          <div><span className="text-shell-400">Protocol:</span> OpenAI-compatible chat completions (SSE streaming)</div>
          <div><span className="text-shell-400">MCP:</span> StreamableHTTPClientTransport → Poseidon</div>
          <div><span className="text-shell-400">Discovery:</span> cosmos-logos v1.0.3 manifest at /.well-known/cosmos-logos.json</div>
          <div><span className="text-shell-400">Security:</span> Ed25519 sealed envelope verification</div>
          <div><span className="text-shell-400">License:</span> MIT</div>
        </div>
        <p className="mt-2">
          <a href="https://github.com/olympus-616/athena" target="_blank" rel="noopener"
            className="text-xs text-shell-400 hover:underline">
            View source on GitHub →
          </a>
        </p>
      </Section>
    </div>
  );
}

/* ================================================================ */
/* Thoth                                                              */
/* ================================================================ */
function ThothDocs() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <BackLink label="Back to Learn" />
      <div className="flex items-center gap-3">
        <span className="text-3xl">📜</span>
        <div>
          <h1 className="text-2xl font-bold">Thoth</h1>
          <p className="text-sm text-text-muted">Sovereign writing and coding agent — your personal scribe</p>
        </div>
      </div>

      <Section title="What is Thoth?" defaultOpen>
        <p>
          <strong>Thoth</strong> is a writing and coding agent that runs on your own machine. He keeps
          a journal, reviews your code, manages git branches, and provides editorial feedback — all
          powered by Claude and stored in your local git repository.
        </p>
        <p>
          Unlike cloud-based writing tools, Thoth stores everything in git. Your journal entries are
          commits. Your code reviews are local. Nothing leaves your machine unless you push to GitHub.
        </p>
      </Section>

      <Section title="What can Thoth do?">
        <ul className="list-disc list-inside space-y-1 text-text-muted">
          <li><strong className="text-text-secondary">Journal</strong> — Write entries in Markdown, organized by project. Stored as git commits.</li>
          <li><strong className="text-text-secondary">Code Review</strong> — AI-powered PR reviews with structured feedback on your code.</li>
          <li><strong className="text-text-secondary">AI Writing Assistant</strong> — Generate content, get editorial feedback, apply changes with one click.</li>
          <li><strong className="text-text-secondary">GitHub Sync</strong> — Push journal entries to a GitHub repo for backup and sharing.</li>
        </ul>
      </Section>

      <Section title="How to set up Thoth">
        <div className="bg-surface-2 rounded-lg p-3 font-mono text-xs text-text-muted space-y-1">
          <div>$ git clone https://github.com/cosmos-logos/thoth.git</div>
          <div>$ cd thoth && pip install -r requirements.txt</div>
          <div>$ uvicorn thoth.main:app --host 0.0.0.0 --port 3801</div>
        </div>
        <p className="mt-2">Then connect in TurtleShell Agent Setup → enter <code className="text-shell-400">http://localhost:3801</code> or your Tailscale IP.</p>
        <p>For remote access via Tailscale, Thoth's <code className="text-shell-400">cosmos-logos.json</code> on GitHub declares your Tailscale endpoint — only your devices can reach it.</p>
      </Section>

      <Section title="Technical details">
        <div className="bg-surface-2 rounded-lg p-3 font-mono text-xs text-text-muted space-y-1">
          <div><span className="text-shell-400">Framework:</span> Python FastAPI</div>
          <div><span className="text-shell-400">Port:</span> 3801</div>
          <div><span className="text-shell-400">AI:</span> Claude (Anthropic API)</div>
          <div><span className="text-shell-400">Storage:</span> Local git repository</div>
          <div><span className="text-shell-400">Auth:</span> Ed25519 sealed envelopes (cosmos-logos)</div>
          <div><span className="text-shell-400">License:</span> MIT</div>
        </div>
        <p className="mt-2"><a href="https://github.com/cosmos-logos/thoth" target="_blank" rel="noopener" className="text-xs text-shell-400 hover:underline">View source on GitHub →</a></p>
      </Section>
    </div>
  );
}

/* ================================================================ */
/* Homework Buddy                                                     */
/* ================================================================ */
function HomeworkBuddyDocs() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <BackLink label="Back to Learn" />
      <div className="flex items-center gap-3">
        <span className="text-3xl">📚</span>
        <div>
          <h1 className="text-2xl font-bold">Homework Buddy</h1>
          <p className="text-sm text-text-muted">AI homework tutor for kids 10–17</p>
        </div>
      </div>

      <Section title="What is Homework Buddy?" defaultOpen>
        <p>
          <strong>Homework Buddy</strong> is an AI tutor that helps students with their homework
          without just giving them the answers. It guides them step by step, uses encouraging language,
          and tracks assignments with due dates and priorities.
        </p>
        <p>
          It's also the first cosmos-logos agent designed to teach kids how AI works. The entire app
          runs on a local LAMP stack (PHP + MySQL + Docker) — making it a learning tool for both
          homework AND technology.
        </p>
      </Section>

      <Section title="What can Homework Buddy do?">
        <ul className="list-disc list-inside space-y-1 text-text-muted">
          <li><strong className="text-text-secondary">AI Tutoring</strong> — Ask questions about any subject. Grok guides you to the answer.</li>
          <li><strong className="text-text-secondary">Assignment Tracking</strong> — Create, edit, and manage homework with due dates and priorities.</li>
          <li><strong className="text-text-secondary">AI Tool Use</strong> — Grok can create/update/complete assignments from chat using native function calling.</li>
          <li><strong className="text-text-secondary">AI Review</strong> — Click "Ask AI to Review" on any assignment for study tips.</li>
          <li><strong className="text-text-secondary">Family Setup</strong> — Multiple family members, daily message limits for kids.</li>
        </ul>
      </Section>

      <Section title="How to set up Homework Buddy">
        <div className="bg-surface-2 rounded-lg p-3 font-mono text-xs text-text-muted space-y-1">
          <div>$ git clone https://github.com/cosmos-logos/homework-buddy.git</div>
          <div>$ cd homework-buddy && docker compose up -d</div>
          <div>$ open http://localhost:8080</div>
        </div>
        <p className="mt-2">Complete the family setup wizard, then connect in TurtleShell Agent Setup → <code className="text-shell-400">http://localhost:8080</code></p>
        <p>Add your Grok API key in Homework Buddy's Settings tab (get one at <a href="https://console.x.ai" target="_blank" rel="noopener" className="text-shell-400 hover:underline">console.x.ai</a>).</p>
      </Section>

      <Section title="Technical details">
        <div className="bg-surface-2 rounded-lg p-3 font-mono text-xs text-text-muted space-y-1">
          <div><span className="text-shell-400">Framework:</span> PHP 8.2 / Laravel 11</div>
          <div><span className="text-shell-400">Port:</span> 8080 (nginx) / 9000 (PHP-FPM)</div>
          <div><span className="text-shell-400">AI:</span> Grok (xAI) with native function calling</div>
          <div><span className="text-shell-400">Database:</span> MySQL 8</div>
          <div><span className="text-shell-400">Auth:</span> Ed25519 sealed envelopes (cosmos-logos)</div>
          <div><span className="text-shell-400">License:</span> MIT</div>
        </div>
        <p className="mt-2"><a href="https://github.com/cosmos-logos/homework-buddy" target="_blank" rel="noopener" className="text-xs text-shell-400 hover:underline">View source on GitHub →</a></p>
      </Section>
    </div>
  );
}

/* ================================================================ */
/* Agora                                                              */
/* ================================================================ */
function AgoraDocs() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <BackLink label="Back to Learn" />
      <div className="flex items-center gap-3">
        <span className="text-3xl">🏛️</span>
        <div>
          <h1 className="text-2xl font-bold">Agora</h1>
          <p className="text-sm text-text-muted">Sovereign group collaboration for families, teams, and neighborhoods</p>
        </div>
      </div>

      <Section title="What is Agora?" defaultOpen>
        <p>
          <strong>Agora</strong> is a group collaboration tool where your data lives in your own
          Google Drive and Sheets — not on someone else's server. Create a group, invite members,
          manage projects, and chat with AI assistance powered by Gemini.
        </p>
        <p>
          Every group is a Google Sheet with 5 tabs (messages, members, projects, tasks, assets).
          Every file is in your Google Drive. You own it all.
        </p>
      </Section>

      <Section title="What can Agora do?">
        <ul className="list-disc list-inside space-y-1 text-text-muted">
          <li><strong className="text-text-secondary">Group Chat</strong> — Send messages stored in Google Sheets. AI auto-replies with role-aware personas.</li>
          <li><strong className="text-text-secondary">Projects</strong> — Create and manage projects. Gemini can create/update/complete them from chat.</li>
          <li><strong className="text-text-secondary">AI Personas</strong> — Choose: Owner, PM, Decorator, Foreman, or General Assistant.</li>
          <li><strong className="text-text-secondary">Google Integration</strong> — OAuth sign-in, Drive folders, Sheets storage. Your data, your account.</li>
          <li><strong className="text-text-secondary">Gemini Function Calling</strong> — "Add a project: Replace Fireplace" → AI creates it in the Sheet.</li>
        </ul>
      </Section>

      <Section title="How to set up Agora">
        <div className="bg-surface-2 rounded-lg p-3 font-mono text-xs text-text-muted space-y-1">
          <div>$ git clone https://github.com/cosmos-logos/agora.git</div>
          <div>$ cd agora && npm install && npm start</div>
          <div>$ open http://localhost:4200</div>
        </div>
        <p className="mt-2">Sign in with Google, create a group, then connect in TurtleShell Agent Setup → <code className="text-shell-400">http://localhost:4200</code></p>
        <p>Add your Gemini API key in Agora's Settings page (get one at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="text-shell-400 hover:underline">aistudio.google.com</a>).</p>
      </Section>

      <Section title="Technical details">
        <div className="bg-surface-2 rounded-lg p-3 font-mono text-xs text-text-muted space-y-1">
          <div><span className="text-shell-400">Framework:</span> Angular 17 + Tailwind CSS</div>
          <div><span className="text-shell-400">Port:</span> 4200 (dev server) / 4201 (setup server)</div>
          <div><span className="text-shell-400">AI:</span> Gemini 2.5 Flash with native function calling</div>
          <div><span className="text-shell-400">Storage:</span> Google Sheets + Google Drive (user's own account)</div>
          <div><span className="text-shell-400">Auth:</span> Google OAuth 2.0 + Ed25519 sealed envelopes</div>
          <div><span className="text-shell-400">License:</span> MIT</div>
        </div>
        <p className="mt-2"><a href="https://github.com/cosmos-logos/agora" target="_blank" rel="noopener" className="text-xs text-shell-400 hover:underline">View source on GitHub →</a></p>
      </Section>
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
        <Route path="athena" element={<AthenaDocs />} />
        <Route path="thoth" element={<ThothDocs />} />
        <Route path="homework-buddy" element={<HomeworkBuddyDocs />} />
        <Route path="agora" element={<AgoraDocs />} />
      </Routes>
    </div>
  );
}
