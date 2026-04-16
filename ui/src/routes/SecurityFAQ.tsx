import { Link } from 'react-router-dom';

/**
 * Security Frequently Asked Questions — public white paper.
 *
 * Long-form technical document covering the authentication model,
 * token lifecycle, data handling, sovereign-node boundaries, off-grid
 * disclaimer, change-management process, outage + vulnerability
 * response, and compliance posture. Written to answer every question a
 * competent CISO / CIO / security architect would ask before allowing
 * their organization to connect to a TurtleShell.ai / Olympus-Grid
 * sovereign node.
 *
 * Route: /security-faq (public, no auth required)
 * Cross-linked from the /security summary page and the landing page
 * Learn index.
 *
 * Disclaimer posture: the software is open-source (AGPL-3.0) and
 * provided AS-IS. No warranty, no indemnification. Code-review rigor
 * is the real trust primitive; this document describes it plainly.
 */
export function SecurityFAQ() {
  return (
    <div className="max-w-[960px] mx-auto px-6 md:px-10 py-16 text-text-secondary">
      {/* ─────────────────────────────── Title block */}
      <header className="mb-14 pb-10 border-b border-border-muted">
        <div className="text-2xs uppercase tracking-[0.3em] text-shell-400 mb-3">
          Security · White Paper
        </div>
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-text-primary leading-tight mb-5">
          Security Frequently<br />Asked Questions
        </h1>
        <p className="text-base text-text-muted font-light leading-loose max-w-[720px]">
          A plain-language technical reference for how TurtleShell.ai, Olympus-Grid, and
          the sovereign nodes built on top of it handle identity, tokens, data, outages,
          and vulnerabilities. Written to answer the hard questions a competent CISO,
          CIO, or technical architect is obligated to ask before connecting an
          organization to any new system.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-2xs text-text-muted uppercase tracking-widest">
          <span>Last reviewed: 2026-04-16</span>
          <span>·</span>
          <span>License: AGPL-3.0</span>
          <span>·</span>
          <span>Source: public on GitHub</span>
        </div>
      </header>

      {/* ─────────────────────────────── Top disclaimer */}
      <aside className="mb-12 rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-6">
        <div className="text-2xs uppercase tracking-[0.25em] text-amber-400 font-semibold mb-2">
          Read This First
        </div>
        <p className="text-sm text-text-secondary font-light leading-loose mb-3">
          TurtleShell.ai, Olympus-Grid, Olympus-616, and every sovereign node licensed
          from this codebase are provided{' '}
          <strong className="text-text-primary font-medium">
            &ldquo;AS IS&rdquo; without warranty of any kind
          </strong>
          , express or implied, including but not limited to the warranties of
          merchantability, fitness for a particular purpose, or non-infringement.
        </p>
        <p className="text-sm text-text-secondary font-light leading-loose mb-3">
          We{' '}
          <strong className="text-text-primary font-medium">indemnify no party</strong>
          . You are responsible for understanding what you connect to, what data you
          send through it, and what regulatory obligations apply to you. This document
          is the best faithful description we can give of how the system works so that
          you can make that decision intelligently.
        </p>
        <p className="text-sm text-text-secondary font-light leading-loose">
          Sound security architecture is the only thing that makes a system trustworthy.
          We&apos;ve done our best to build one and to describe it honestly. The only
          durable trust primitive is reviewable, open source code —{' '}
          <a
            href="https://github.com/cosmos-logos"
            target="_blank"
            rel="noopener noreferrer"
            className="text-shell-400 hover:underline no-underline"
          >
            ours is public
          </a>
          .
        </p>
      </aside>

      {/* ─────────────────────────────── Table of contents */}
      <nav className="mb-16 rounded-xl border border-border-muted bg-surface-1 p-6">
        <div className="text-2xs uppercase tracking-[0.25em] text-text-muted font-semibold mb-4">
          Contents
        </div>
        <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 list-decimal list-inside text-sm text-text-secondary">
          <li><a href="#what-is-olympus-grid" className="hover:text-shell-400">What is Olympus-Grid?</a></li>
          <li><a href="#what-is-olympus-616" className="hover:text-shell-400">What is Olympus-616?</a></li>
          <li><a href="#protect-tokens" className="hover:text-shell-400">How do we protect tokens?</a></li>
          <li><a href="#data-we-keep" className="hover:text-shell-400">What data do we keep?</a></li>
          <li><a href="#why-trust" className="hover:text-shell-400">Why should I trust you?</a></li>
          <li><a href="#use-of-data" className="hover:text-shell-400">What do you do with my data?</a></li>
          <li><a href="#opt-out" className="hover:text-shell-400">How do I opt out / export / delete?</a></li>
          <li><a href="#compliance" className="hover:text-shell-400">HIPAA, GDPR, CCPA, SOC 2?</a></li>
          <li><a href="#arch" className="hover:text-shell-400">Architecture deep dive</a></li>
          <li><a href="#auth" className="hover:text-shell-400">Authentication flows</a></li>
          <li><a href="#jwt" className="hover:text-shell-400">JWTs &amp; token lifecycle</a></li>
          <li><a href="#cosmos-logos" className="hover:text-shell-400">cosmos-logos sealed envelopes</a></li>
          <li><a href="#offgrid" className="hover:text-shell-400">Off-Grid — use at your own risk</a></li>
          <li><a href="#change-mgmt" className="hover:text-shell-400">Change management &amp; code review</a></li>
          <li><a href="#outages" className="hover:text-shell-400">Outages &amp; reliability</a></li>
          <li><a href="#vulns" className="hover:text-shell-400">Security vulnerabilities</a></li>
          <li><a href="#contact" className="hover:text-shell-400">Contact &amp; disclosure</a></li>
          <li><a href="#disclaimers" className="hover:text-shell-400">Legal disclaimers</a></li>
        </ol>
      </nav>

      {/* ─────────────────────────────── FAQ 1 */}
      <Section id="what-is-olympus-grid" number="1" title="What is Olympus-Grid?">
        <P>
          <strong>Olympus-Grid</strong> is the name of the Salesforce managed package and
          the reference application stack that implements the 31-agent sovereign AI
          system we call the Pantheon. It is the platform that hosts and coordinates the
          specialized agents (Athena for LLM routing, Hermes for API ingress, Poseidon
          for MCP tool access, Apollo for text-to-speech, Mnemosyne for memory, Plutus
          for billing, Iris for the Salesforce-hosted portal, etc.) and provides the
          operational scaffolding — identity, authentication, usage metering, plugin
          registry, request isolation — that lets those agents be composed into a
          coherent AI operating system.
        </P>
        <P>
          Olympus-Grid publishes under Salesforce namespace{' '}
          <Code>og_node_beta_1</Code> and is listed on the Salesforce AppExchange at{' '}
          <a
            href="https://appexchange.salesforce.com/appxListingDetail?listingId=aadbbe80-2d4e-42bc-84bd-348ade18a00a"
            target="_blank"
            rel="noopener noreferrer"
            className="text-shell-400 hover:underline no-underline"
          >
            appxListingDetail?listingId=aadbbe80-2d4e-42bc-84bd-348ade18a00a
          </a>
          . The source is open (AGPL-3.0) at{' '}
          <a
            href="https://github.com/olympus-616"
            target="_blank"
            rel="noopener noreferrer"
            className="text-shell-400 hover:underline no-underline"
          >
            github.com/olympus-616
          </a>
          .
        </P>
        <P>
          Olympus-Grid is deliberately a <em>platform</em> rather than a single
          deployment. Anyone can license it and stand up their own instance. Each such
          instance is what we call a <strong>sovereign node</strong>.
        </P>
      </Section>

      {/* ─────────────────────────────── FAQ 2 */}
      <Section id="what-is-olympus-616" number="2" title="What is Olympus-616?">
        <P>
          <strong>Olympus-616</strong> is the <em>first</em> sovereign node — the
          reference production instance of Olympus-Grid, operated by CloudPremise LLC
          and hosted on AWS behind CloudFront at{' '}
          <Code>api-int.turtleshell.ai</Code>. The number 616 is its identifier; it is
          one node in what will eventually be many.
        </P>
        <P>
          Other organizations can stand up their own sovereign nodes — Olympus-303,
          Olympus-707, whatever naming they prefer. Each node is an independent, fully
          isolated deployment of Olympus-Grid with its own data, its own keys, its own
          operational control, and its own operator. The node operator owns its tenant
          completely. We operate 616; we do not operate 303 or any other node.
        </P>
        <P>
          Because every node implements the same <strong>cosmos-logos</strong>{' '}
          handshake (see §12) and exposes its agents over HTTPS, components inside one
          sovereign node can trust and interoperate with components inside another
          node. An agent on Olympus-303 can verify a message came from Olympus-616 by
          reading 616&apos;s published manifest, fetching 616&apos;s public Ed25519 key,
          and performing the sealed-envelope challenge. No centralized identity
          provider is required. No trust brokers. Each node is self-asserting and each
          node&apos;s operator is responsible for the integrity of the keys they
          publish.
        </P>
        <P>
          This model matters for the security conversation: when you interact with
          something hosted on Olympus-616, you are interacting with us (CloudPremise
          LLC). When you interact with something on Olympus-303, you are interacting
          with <em>that</em> operator. The cosmos-logos protocol lets you verify which
          is which, cryptographically.
        </P>
      </Section>

      {/* ─────────────────────────────── FAQ 3 */}
      <Section id="protect-tokens" number="3" title="How do we protect tokens?">
        <P>
          Three token classes flow through the system. Each has a distinct lifecycle.
        </P>

        <Subhead>Identity JWT (&ldquo;og_access_token&rdquo;)</Subhead>
        <P>
          Issued after a successful Sign in with Apple or email magic-link verification.
          Signed <strong>inside Salesforce</strong> using{' '}
          <Code>Crypto.signWithCertificate</Code> and the{' '}
          <Code>OG_Signing_Key</Code> certificate private key, which never leaves
          Salesforce. The matching public certificate is replicated to Ares at build
          time so the edge gateway can verify JWTs without a round-trip. JWT payloads
          carry{' '}
          <Code>sub</Code> (user identity), <Code>iss</Code>, <Code>aud</Code>,{' '}
          <Code>iat</Code>, <Code>exp</Code>. The signing algorithm is RS256.
        </P>
        <P>
          On the browser, the token is stored in <Code>localStorage</Code> and sent on
          requests via the <Code>x-user-identity</Code> header. On iOS, it is stored in
          the iOS <strong>Keychain</strong> (hardware-backed on Secure Enclave devices)
          and sent via the same header. We deliberately do <em>not</em> rely on
          cookies for cross-origin delivery — this is why the header path exists. It
          makes the identity ferry explicit and auditable in every request.
        </P>

        <Subhead>Third-party OAuth tokens (Google, GitHub, HubSpot, Workday, ...)</Subhead>
        <P>
          When you connect a third-party service (Google Drive, GitHub, Salesforce
          inside your tenant, etc.), the OAuth access + refresh tokens are returned
          directly by the provider to our OAuth-callback endpoint. These are{' '}
          <strong>immediately encrypted</strong> before any write to disk. We do not
          log raw tokens, we do not expose them through any API, and we do not mirror
          them between sovereign nodes.
        </P>
        <P>
          Tokens are delivered to agents that need them using the{' '}
          <strong>cosmos-logos sealed envelope</strong> pattern (see §12): the token is
          encrypted against the target agent&apos;s published public key using
          libsodium-style sealed-box semantics. After sealing, not even the sender can
          re-open the envelope; only the private-key holder (the target agent) can
          decrypt. This is how we minimize the number of components on the wire path
          that ever see a plaintext token.
        </P>

        <Subhead>StoreKit / Stripe billing tokens</Subhead>
        <P>
          We never see card numbers, CVVs, or bank details.{' '}
          <strong>Stripe</strong> (PCI-DSS Level 1) processes all web payments; we
          receive a signed webhook + a short opaque customer id. Apple StoreKit 2
          processes all iOS payments; we receive a signed JWS transaction receipt
          (also opaque) that we forward to our billing agent for server-side
          verification against Apple&apos;s public key.
        </P>
      </Section>

      {/* ─────────────────────────────── FAQ 4 */}
      <Section id="data-we-keep" number="4" title="What data do we keep?">
        <P>
          Olympus-616 stores the following categories of data in Salesforce (the system
          of record) and nothing else:
        </P>
        <BulletList items={[
          <><strong>Identity record</strong> — the user&apos;s stable <Code>sub</Code> identifier, email address, first / last name (if provided by the user or by Apple Sign In), locale, and a record of email-verification and Apple-sign-in events. Stored as <Code>Identity__c</Code>.</>,
          <><strong>TurtleShell profile</strong> — account status (Waitlist / Approved / Active / Suspended), onboarding selections (cause, guide, tier), shell balance, subscription tier, and a link to the Salesforce Identity record. Stored as <Code>TurtleshellProfile__c</Code>.</>,
          <><strong>Conversations</strong> — only if the user has <em>Auto-Save</em> enabled in chat settings. Stores turn-by-turn prompt / response pairs with timestamps under <Code>Conversation__c</Code>. Auto-save is off by default unless the user affirmatively enables it.</>,
          <><strong>Memories</strong> — only memories the LLM itself has written via the Mnemosyne memory-write tool during conversation. Stored as <Code>Memory__c</Code> and always scoped to the user who authored them. Users can view, edit, and permanently delete any memory at any time from the in-app Memory page.</>,
          <><strong>Usage metering</strong> — anonymized shell-burndown events: which agent was called, how many shells were consumed, timestamp. No prompt content is stored in the metering stream. Used to enforce quotas and reconcile against Stripe / StoreKit receipts.</>,
          <><strong>Subscription state</strong> — the Stripe customer id (opaque) or Apple original transaction id, tier, renewal + cancellation timestamps. Needed so we can honor the plan you&apos;ve paid for.</>,
          <><strong>Operational logs</strong> — request-level telemetry (URL path, HTTP status, latency, user id, no body content) for debugging and abuse detection. Retained 30 days, then rolled.</>,
        ]} />
        <P>
          We do <strong>not</strong> store raw chat bodies outside the conversation
          object (and only then with Auto-Save on), we do <strong>not</strong> store
          raw memory writes outside the memory object, and we do <strong>not</strong>{' '}
          share any stored data with any third party outside the request path described
          in the architecture section.
        </P>
      </Section>

      {/* ─────────────────────────────── FAQ 5 */}
      <Section id="why-trust" number="5" title="Why should I trust you?">
        <P>
          Trust is not something a vendor can assert — it is a property of the
          evidence. Here is the evidence we offer.
        </P>
        <BulletList items={[
          <><strong>The code is public.</strong> The entire Olympus-Grid codebase is licensed AGPL-3.0 and is hosted publicly on GitHub. You can read every line of every agent, every line of the Salesforce Apex layer, every line of the iOS and web clients. There is no proprietary server-side component we are hiding.</>,
          <><strong>The change process is public.</strong> Every change is made as a git pull request against a protected main branch. Every PR requires review. Every merge is squash-merged and GPG-signed. Every CI run is visible. You can audit not just the code today but the full history of how it came to be.</>,
          <><strong>The cryptographic primitives are standard.</strong> Ed25519 signatures, RS256 JWTs, X25519 sealed boxes, ChaCha20-Poly1305 AEAD for iOS. No custom crypto, no rolled-our-own primitives. NIST / IETF / libsodium standards, implemented by the platform libraries (Apple CryptoKit, OpenSSL, Node crypto).</>,
          <><strong>The infrastructure is reputable.</strong> Customer identity and billing lives in Salesforce (SOC 2, ISO 27001, HIPAA-capable with BAA). Cloud compute lives in AWS (SOC 2, ISO 27001, HIPAA-capable with BAA). Payments route through Stripe (PCI-DSS Level 1). We do not hold primary responsibility for the compliance posture of the substrate — that is already audited.</>,
          <><strong>You can self-host.</strong> If you don&apos;t want to trust <em>us</em> (CloudPremise LLC), stand up your own sovereign node. Every user-facing feature of Olympus-616 works the same way when you run Olympus-Grid inside your own Salesforce org, your own AWS account, or your own Mac Mini. The AppExchange listing is the licensed package.</>,
          <><strong>You can verify every message.</strong> cosmos-logos gives you a cryptographic handshake with every agent before you trust it. Even when using Olympus-616, you are not asked to take our word for which node you are talking to — you can verify it against the published Ed25519 key.</>,
        ]} />
        <P>
          None of this removes the risk. All of this makes the risk inspectable. That
          is the best offer a software vendor can honestly make, and it is the one we
          make here.
        </P>
      </Section>

      {/* ─────────────────────────────── FAQ 6 */}
      <Section id="use-of-data" number="6" title="What do you do with my data?">
        <P>
          We use it only to deliver the service you asked for. Specifically:
        </P>
        <BulletList items={[
          <>Your identity record is used to authenticate requests and to remember what tier / agent / cause you have chosen.</>,
          <>Your conversations (if you opted into Auto-Save) are used to let you resume them and to let the LLM agent recall context you granted it access to during the same session.</>,
          <>Your memories are used to inject context into your own future conversations with your own agent — nothing else.</>,
          <>Your billing data is used to enforce your shell quota and to deliver the plan you paid for.</>,
          <>Your operational logs are used to find bugs, detect abuse, and size infrastructure.</>,
        ]} />
        <P>
          We do <strong>not</strong> sell your data. We do <strong>not</strong> train
          models on your data. We do <strong>not</strong> share your conversations or
          memories with any third party other than the LLM provider you explicitly
          selected as your routing target (OpenAI, Anthropic, xAI, Google, or a local
          model of your choice). Those providers have their own policies; we pass
          through only what is necessary for the turn you initiated, and only to the
          provider you chose.
        </P>
        <P>
          If you bring your own API key (BYOK) for a provider, your prompts never
          transit our cloud billing path at all — they go directly from your device to
          your provider using your key.
        </P>
      </Section>

      {/* ─────────────────────────────── FAQ 7 */}
      <Section id="opt-out" number="7" title="How do I opt out, export, or delete?">
        <P>
          Every data category described in §4 is reversible by you, directly, in
          product:
        </P>
        <BulletList items={[
          <><strong>Auto-Save (conversations)</strong> — off by default. You can turn it off at any time from chat settings; future turns are stateless. Existing saved conversations can be cleared individually or in bulk from the History page.</>,
          <><strong>Memory</strong> — you see every memory your agent has written about you on the in-app Memory page. Each one has a pencil (edit) button and a trash (forget) button. "Forget" issues an immediate server-side hard delete.</>,
          <><strong>Account deletion</strong> — email <a href="mailto:security@turtleshell.ai" className="text-shell-400 hover:underline no-underline">security@turtleshell.ai</a> and we will delete your Identity__c, TurtleshellProfile__c, all linked Conversation__c and Memory__c records within 30 days, and confirm completion to you in writing. We retain a minimal record of the deletion event itself (account id + timestamp) for audit purposes only, per tax + fraud-prevention obligations.</>,
          <><strong>Data export</strong> — on request, we&apos;ll give you a JSON bundle of your Identity, profile, conversations, and memories. Same mailbox, same 30-day window.</>,
          <><strong>Third-party tokens</strong> — any OAuth connection you&apos;ve made (Google Drive, GitHub, etc.) can be revoked from the Services page. Revocation removes our stored encrypted refresh-token immediately and the provider&apos;s access token at next renewal.</>,
          <><strong>Unsubscribe</strong> — email is transactional only (waitlist confirmation, sign-in magic links, billing receipts). We do not send marketing email. If we ever do, there will be an explicit opt-in and a CAN-SPAM footer.</>,
        ]} />
      </Section>

      {/* ─────────────────────────────── FAQ 8 */}
      <Section id="compliance" number="8" title="HIPAA, GDPR, CCPA, SOC 2?">
        <P>
          We are honest about compliance posture, which means we are honest about what
          we have <em>not</em> certified.
        </P>
        <BulletList items={[
          <><strong>HIPAA:</strong> Olympus-616 is <em>not</em> HIPAA-certified at this time. Salesforce and AWS are HIPAA-capable under a BAA, and a future enterprise tier will offer BAA coverage for the portions of the stack that we operate. Until that offering is explicitly advertised, <em>do not transmit PHI</em> through the system.</>,
          <><strong>GDPR:</strong> CloudPremise LLC is a US entity but the GDPR framework is inherited where we process data about EU data subjects. Our retention, deletion, export, and right-to-be-forgotten flows are designed to satisfy Articles 15, 16, 17, and 20. Request routing: <a href="mailto:security@turtleshell.ai" className="text-shell-400 hover:underline no-underline">security@turtleshell.ai</a>.</>,
          <><strong>CCPA:</strong> California residents have the right to know what we collect, to request deletion, and to opt out of sale. We do not sell personal information, and the in-product export / delete paths described above satisfy the "know" and "delete" rights. A CCPA-specific disclosure lives at <Link to="/privacy" className="text-shell-400 hover:underline no-underline">/privacy</Link>.</>,
          <><strong>SOC 2:</strong> Our substrate providers (Salesforce, AWS, Stripe) are SOC 2 Type 2. Olympus-616 as an application layer is <em>not independently</em> SOC 2 certified. A SOC 2 audit is on the roadmap for the enterprise offering; we will announce it when complete.</>,
          <><strong>COPPA:</strong> We do not knowingly accept users under 13. The AI Homework Tutor — which is cosmos-logos-compatible but runs on a family&apos;s own server — is deliberately positioned outside our platform for this reason until COPPA certification is in place.</>,
          <><strong>PCI-DSS:</strong> We do not store or transit payment card data. Stripe (PCI-DSS Level 1) handles all card flows. Scope is limited to the opaque customer id we receive in return.</>,
        ]} />
        <P>
          If your use case is subject to a regulatory framework we have not certified
          against (HIPAA PHI, FERPA education records, ITAR export-controlled data, IRS
          6103 tax data, etc.), the right answer is usually to deploy your own
          sovereign node in your own compliant environment — see §13 on self-hosting,
          or contact us about an enterprise deployment with the appropriate agreements
          in place.
        </P>
      </Section>

      {/* ─────────────────────────────── Architecture deep dive */}
      <Section id="arch" number="9" title="Architecture deep dive">
        <P>
          Olympus-Grid is a fleet of specialized agents — the Pantheon — running as
          Node.js services inside a single container image we call{' '}
          <strong>Pantheon</strong>, orchestrated by AWS ECS in the reference
          Olympus-616 deployment. Salesforce sits adjacent to the fleet as the system
          of record for identity, subscription, and audit.
        </P>
        <Subhead>Request path</Subhead>
        <P>
          A normal chat request flows:
        </P>
        <CodeBlock lines={[
          'Client (web, iOS, Iris portal, off-grid appliance)',
          '  │',
          '  ▼',
          'Ares (edge gateway, CloudFront → ECS)           ← TLS terminated here',
          '  │      verifies x-developer-key',
          '  │      verifies og_access_token JWT against OG_Signing_Key public cert',
          '  │      converts httpOnly cookies → x-user-identity header',
          '  ▼',
          'Hermes (API router, ECS-internal)',
          '  │      routes /v1/{agent}/… to the right agent',
          '  │      rate limit + abuse heuristics',
          '  ▼',
          'Athena (LLM gateway)',
          '  │      selects provider (OpenAI / Anthropic / xAI / Google / Ollama)',
          '  │      attaches MCP tools via sealed envelope (Poseidon)',
          '  │      injects system prompt from cosmos-logos manifest',
          '  │      streams SSE response back through Hermes → Ares → client',
        ]} />
        <P>
          Every hop runs inside the VPC after Ares. External egress to the LLM provider
          is done from Athena only. Tokens needed for MCP tool calls are sealed against
          Poseidon&apos;s public key and opened only inside Poseidon.
        </P>

        <Subhead>Service fleet</Subhead>
        <BulletList items={[
          <><Code>ares</Code> — edge security gateway. All external traffic enters here. Cookie-to-header conversion, JWT verify, developer key check.</>,
          <><Code>hermes</Code> — internal API router + rate limiter. Does not speak to external services.</>,
          <><Code>athena</Code> — multi-provider LLM gateway.</>,
          <><Code>poseidon</Code> — MCP tool server (Salesforce / Google / GitHub / HubSpot / Workday / Weather / Proteus / Prometheus / Mnemosyne).</>,
          <><Code>apollo</Code> — TTS (text-to-speech).</>,
          <><Code>mnemosyne</Code> — memory + conversation persistence.</>,
          <><Code>plutus</Code> — billing, shell quota enforcement, Stripe + Apple IAP receipt verification.</>,
          <><Code>iris</Code> — Salesforce-hosted portal experience (React inside Lightning).</>,
          <><Code>zeus</Code> — CDK deploy tooling. Not a runtime dependency.</>,
        ]} />
      </Section>

      {/* ─────────────────────────────── Auth */}
      <Section id="auth" number="10" title="Authentication flows">
        <Subhead>Sign in with Apple (iOS + web)</Subhead>
        <P>
          Confirmed working in production on the Iris portal at{' '}
          <Code>app.olympus-grid.com</Code> as of 2026-04-16.
        </P>
        <CodeBlock lines={[
          '1. Client presents ASAuthorizationAppleIDProvider (iOS)',
          '   or Apple JS SDK popup (web / Iris)',
          '2. Apple returns an identity JWT signed by Apple',
          '3. Client POSTs { identityToken, email, firstName, lastName }',
          '   to Ares → /v1/auth/apple/identity/verify',
          '4. Ares verifies the identity token against Apple\'s JWKS',
          '   (https://appleid.apple.com/auth/keys, cached + rotated)',
          '5. Verified claims are forwarded via Hermes to Salesforce Apex',
          '   (ApiRouteAuth.handleAppleSignIn)',
          '6. Apex runs AppleIdentityResolver.findOrCreateFromClaims:',
          '     a. SELECT Identity__c WHERE AppleUserId__c = :sub',
          '     b. else if email present, SELECT WHERE Email__c = :email',
          '        → stamp AppleUserId__c onto the existing record (link)',
          '     c. else INSERT a fresh Identity__c with a new Sub__c UUID',
          '7. TurtleshellProfile__c is created or promoted',
          '     (Approved → Active on first sign-in)',
          '8. Apex signs an og_access_token JWT using OG_Signing_Key',
          '9. JWT is returned to the client; stored in Keychain (iOS)',
          '   or localStorage (web) and sent as x-user-identity henceforth',
        ]} />
        <P>
          The private key backing <Code>OG_Signing_Key</Code> never leaves Salesforce.
          The public certificate is copied into Ares at container-build time so Ares
          can verify tokens without round-tripping Salesforce on every request.
          Certificate sync is automatic as part of the olympus-grid build pipeline.
        </P>

        <Subhead>Email magic link (web + iOS fallback)</Subhead>
        <CodeBlock lines={[
          '1. Client POSTs { email, clientId, callbackUrl }',
          '   to Ares → /v1/grid/master/auth/email/link/request',
          '2. Apex creates or finds Identity__c by email',
          '3. Apex generates an 8-character code and writes',
          '   IdentityToken__c(TokenType=\'auth_request\', ValidUntil=now+10m)',
          '4. Apex sends a branded email containing the code',
          '     (and a deep-link URL carrying both code + requestId)',
          '5. Client displays the verification-code entry UI',
          '6. User submits the code',
          '7. Client POSTs { code, requestId }',
          '   to Ares → /v1/grid/master/auth/email/link/verify',
          '8. Apex validates:',
          '     - token exists and ValidUntil > now',
          '     - TokenId matches (case-insensitive)',
          '9. On success, Apex marks the token expired (prevents replay),',
          '   promotes the profile (Approved → Active), signs a JWT,',
          '   returns JWT via response body (or x-og-access-token header',
          '   when the client requests x-token-delivery: header).',
        ]} />
        <P>
          A brand-new waitlist email returns <em>no</em> requestId. The client takes
          that as the signal to render the "You&apos;re on the List" screen rather
          than the code-entry screen. This is how we keep a gate between waitlist
          signup and actual authentication without inventing a separate endpoint.
        </P>
      </Section>

      {/* ─────────────────────────────── JWTs */}
      <Section id="jwt" number="11" title="JWTs & token lifecycle">
        <P>
          Every access token is a signed JWT (RS256) with the following shape:
        </P>
        <CodeBlock lines={[
          '{',
          '  "iss": "olympus-grid-alpha-1.my.salesforce.com",',
          '  "sub": "<stable identity UUID — never recycled>",',
          '  "aud": "turtleshell-ios" | "turtleshell-web" | "iris-portal",',
          '  "iat": <epoch sec>,',
          '  "exp": <epoch sec, typically iat + 3600>,',
          '  "email": "<user email>",',
          '  "email_verified": true|false,',
          '  "identity_sub": "<canonical x-identity-sub header value>"',
          '}',
        ]} />
        <P>
          Tokens expire in 1 hour. Refresh is handled by the{' '}
          <Code>/v1/grid/master/auth/token/session/refresh</Code> endpoint using a
          separate refresh token. Refresh tokens rotate on every use. Refresh fails
          silently → client pushes user back to sign-in. No token is valid across
          sovereign nodes; each node signs with its own <Code>OG_Signing_Key</Code>.
        </P>
        <P>
          Ares verifies every incoming JWT on every request. There is no JWT cache on
          the edge — the signature check is cheap (RS256 public-key verify), and
          short-cutting it would violate our principle that every hop must re-verify.
        </P>
      </Section>

      {/* ─────────────────────────────── cosmos-logos */}
      <Section id="cosmos-logos" number="12" title="cosmos-logos sealed envelopes">
        <P>
          <strong>cosmos-logos</strong> is the agent-discovery + message-sealing
          protocol that connects components across sovereign nodes. Every agent
          publishes a manifest at{' '}
          <Code>/.well-known/cosmos-logos.json</Code> that declares its identity,
          capabilities, and Ed25519 public key. The handshake is:
        </P>
        <CodeBlock lines={[
          '1. Client GETs /.well-known/cosmos-logos.json from the target agent',
          '2. Client seals a random nonce against the manifest public key',
          '     — web: libsodium crypto_box_seal (X25519 + XSalsa20 + Poly1305)',
          '     — iOS: apple-cryptokit variant',
          '            (ECDH → HKDF("cosmos-logos-seal") → ChaCha20-Poly1305)',
          '3. Client POSTs the sealed envelope to /api/cosmos/verify-envelope',
          '4. Agent decrypts using its private key, computes SHA-256 of',
          '   the plaintext, signs the digest with its Ed25519 key,',
          '   returns { proof: <sha256>, signature: <ed25519> }',
          '5. Client verifies the signature against the manifest public key',
          '6. If the signature validates AND the proof matches the client\'s',
          '   locally-computed SHA-256 of the original nonce, the agent is',
          '   proven to hold the private key matching its advertised public key',
          '7. Only then is the agent "connected" and accepts tool invocations',
        ]} />
        <P>
          Private keys on the production fleet are stored in AWS SSM Parameter Store
          (SecureString) and injected into the Pantheon container via Zeus CDK at
          deploy time. Private keys for off-grid deployments live on the operator's
          local filesystem (typically <Code>~/.keys/</Code>) and are the operator's
          responsibility.
        </P>
      </Section>

      {/* ─────────────────────────────── Off-grid */}
      <Section id="offgrid" number="13" title="Off-Grid — use at your own risk">
        <P>
          Off-Grid deployment means running a full Olympus-Grid (or a subset of agents)
          on hardware you own: Mac Mini, Raspberry Pi 5, custom ARM appliance. The
          appliance is reachable from your phone via Tailscale, a local mDNS domain,
          or a port-717 reverse proxy.
        </P>
        <P className="text-amber-400 font-medium">
          Off-Grid is offered as an option, not as a supported product tier. You are
          the operator. We provide no warranty, no uptime commitment, no incident
          response, no disaster recovery, and no compliance coverage for an Off-Grid
          installation. If you deploy Off-Grid, you accept full responsibility for:
        </P>
        <BulletList items={[
          'Physical security of the device',
          'Key management and rotation',
          'OS patching',
          'Network configuration (firewalls, Tailscale ACLs, etc.)',
          'Backup and recovery',
          'Legal / regulatory compliance for any data processed',
        ]} />
        <P>
          We publish documentation and we keep the Off-Grid image in lockstep with
          Olympus-616 so security fixes flow through the normal release process. But
          whether you apply them, how fast, and whether your configuration is correct —
          that is on you.
        </P>
      </Section>

      {/* ─────────────────────────────── Change management */}
      <Section id="change-mgmt" number="14" title="Change management & code review">
        <P>
          Every line of code in Olympus-Grid — every API endpoint, every Apex class,
          every client view, every cosmos-logos handshake — passes through the
          following gates before it becomes runnable on Olympus-616:
        </P>
        <BulletList items={[
          <><strong>Feature branch.</strong> No direct commits to the main branch (<Code>brain/1.7.x.x</Code>). Work happens on a <Code>thought/</Code> feature branch created via a repo-specific git alias that stamps the branch name with author + timestamp so we can trace intent.</>,
          <><strong>Pull request.</strong> Every change lands as a PR against the main branch. PR description is expected to include: summary, changes, test plan, risk / rollback. Reviewers test the rollback plan with the author before approving risky changes.</>,
          <><strong>GPG-signed commits.</strong> Every commit is GPG-signed. Unsigned commits are rejected at branch protection.</>,
          <><strong>CI green.</strong> Full test suite on every push. Apex unit tests + Node service tests + web type-check + client lint. Broken CI blocks the merge button.</>,
          <><strong>Branch protection.</strong> The main branch is protected. At least one review required. Stale reviews are dismissed when new commits are pushed. Admin merge is disabled by default.</>,
          <><strong>Squash merge.</strong> Every PR becomes a single squash commit on main with a conventional-commit title. The full commit history is preserved inside the PR for forensic purposes.</>,
          <><strong>Automated deploy.</strong> Merge to main triggers the deploy pipeline — Docker build, ECR push, CDK deploy for Pantheon; managed-package beta build for olympus-grid; Netlify publish for turtleshell-web. No human hands on production credentials.</>,
          <><strong>Audit trail.</strong> Every PR, every commit, every deploy is timestamped, attributed, and preserved. If a change broke something, we can show you exactly when, by whom, and with whose review.</>,
        ]} />
        <P>
          This is not a novel process. It is the industry-standard SDLC pipeline used
          by every serious engineering organization. We describe it here because it is
          the only thing that makes any other security claim credible. If the code
          review is weak, nothing else in this document holds up.
        </P>
      </Section>

      {/* ─────────────────────────────── Outages */}
      <Section id="outages" number="15" title="Outages & reliability">
        <P>
          Olympus-616 runs on AWS ECS + CloudFront + Salesforce. When the underlying
          substrate has an outage, we have an outage. When Salesforce has an outage,
          authentication stops working. When CloudFront has an outage, the edge stops
          taking requests. Our commitment is:
        </P>
        <BulletList items={[
          <><strong>Monitor and announce.</strong> Status is posted to <a href="https://status.turtleshell.ai" target="_blank" rel="noopener noreferrer" className="text-shell-400 hover:underline no-underline">status.turtleshell.ai</a> (planned) and on the @turtleshellai handle on X during active incidents.</>,
          <>
            <strong>Graceful degradation where possible.</strong> Client code is
            designed to fail safely — a failed LLM call produces an error in chat, not
            a crash. A failed quota read blocks new turns but doesn&apos;t lose your
            conversation. A failed memory write logs and continues.
          </>,
          <>
            <strong>Post-incident write-ups.</strong> Any outage that lasts more than
            15 minutes is followed by a public post-mortem on the blog within two
            business days, covering what happened, what the blast radius was, and
            what we changed to prevent recurrence.
          </>,
          <>
            <strong>No implicit SLA for free tiers.</strong> Free Forever and
            Beachcomber plans do not carry a contractual uptime commitment. Tide,
            Reef, and Abyss carry an implicit &ldquo;best-effort 99.5%&rdquo;; we
            refund shells for months that fall below this. Enterprise agreements
            carry an explicit SLA negotiated in the contract.
          </>,
        ]} />
      </Section>

      {/* ─────────────────────────────── Vulnerabilities */}
      <Section id="vulns" number="16" title="How we handle security vulnerabilities">
        <P>
          Our responsible-disclosure policy:
        </P>
        <BulletList items={[
          <><strong>Report privately first.</strong> Email <a href="mailto:security@turtleshell.ai" className="text-shell-400 hover:underline no-underline">security@turtleshell.ai</a> with reproducible steps. PGP key available on request. We acknowledge within 72 hours.</>,
          <><strong>Triage and scope.</strong> We confirm or refute the report within 5 business days. High-severity issues (auth bypass, token leakage, RCE) are triaged same-day.</>,
          <><strong>Fix with a timeline.</strong> Critical: fix within 7 days. High: 14 days. Medium: next release cycle. Low: tracked and scheduled.</>,
          <><strong>Coordinated disclosure.</strong> We ask that reporters hold public disclosure until the fix is live. We will credit reporters in the release notes unless they prefer anonymity.</>,
          <><strong>No bounty program yet.</strong> We are too small. We will note this when we are not. In the meantime, we try to be quick and grateful.</>,
          <><strong>Dependabot.</strong> GitHub Dependabot is enabled on all repos. Known-CVE dependencies are patched in the normal release cadence, expedited when severity is high.</>,
        ]} />
      </Section>

      {/* ─────────────────────────────── Contact */}
      <Section id="contact" number="17" title="Contact & disclosure">
        <ContactBlock
          entries={[
            ['Security reports', 'security@turtleshell.ai'],
            ['Privacy / GDPR / CCPA', 'privacy@turtleshell.ai'],
            ['Account deletion', 'security@turtleshell.ai'],
            ['Enterprise + BAA inquiries', 'enterprise@turtleshell.ai'],
            ['General', 'hello@turtleshell.ai'],
          ]}
        />
        <P>
          Mailing address: CloudPremise LLC, USA (full address provided in signed NDA
          for enterprise customers).
        </P>
      </Section>

      {/* ─────────────────────────────── Disclaimers */}
      <Section id="disclaimers" number="18" title="Legal disclaimers">
        <P>
          This document is a description of the system as we currently understand it.
          It is not a contract. It does not create any warranty, covenant, or duty of
          indemnification. The authoritative legal documents are{' '}
          <Link to="/terms" className="text-shell-400 hover:underline no-underline">
            Terms &amp; Conditions
          </Link>
          ,{' '}
          <Link to="/privacy" className="text-shell-400 hover:underline no-underline">
            Privacy Policy
          </Link>
          , and the{' '}
          <a
            href="https://www.gnu.org/licenses/agpl-3.0.en.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-shell-400 hover:underline no-underline"
          >
            GNU AGPL-3.0 license
          </a>
          .
        </P>
        <P>
          TurtleShell.ai, Olympus-Grid, Olympus-616, and all sovereign nodes are
          provided <strong>&ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo;</strong>{' '}
          without warranty of any kind. CloudPremise LLC does not indemnify you, your
          organization, your end-users, or any third party for any loss arising from
          use of the software, interruption of the service, or disclosure of data
          resulting from a failure mode we have not foreseen.
        </P>
        <P>
          Security is a process, not a state. Every measure described in this document
          is the result of our best current understanding of the threat model. As the
          threat model evolves, our measures will evolve. As the system is audited and
          stress-tested, we will update this document. When this document is
          inconsistent with the actual running code, <em>the running code is
          authoritative</em> and we have a bug to fix.
        </P>
        <P className="text-text-muted italic">
          We ship sound architecture because it is the only thing that makes the rest
          of this work. Every line of code in Olympus-Grid and in every sovereign node
          built on top of it passes through the process described in §14 so you can
          trust that the line is safe. The process is the warranty we can actually
          offer.
        </P>
      </Section>

      {/* ─────────────────────────────── Footer */}
      <footer className="mt-16 pt-10 border-t border-border-muted flex flex-wrap items-center justify-between gap-4 text-xs text-text-muted">
        <div>© 2026 CloudPremise LLC · TurtleShell.ai</div>
        <div className="flex items-center gap-4">
          <Link to="/terms" className="hover:text-shell-400">Terms</Link>
          <Link to="/privacy" className="hover:text-shell-400">Privacy</Link>
          <Link to="/security" className="hover:text-shell-400">Security</Link>
        </div>
      </footer>
    </div>
  );
}

/* ============================================================== */
/* Small presentational helpers — kept inside this file because   */
/* they're only used here.                                        */
/* ============================================================== */

function Section({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-14 scroll-mt-24">
      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-text-primary leading-tight mb-6 flex items-baseline gap-3">
        <span className="text-shell-400/50 font-mono text-lg tabular-nums">{number}.</span>
        <span>{title}</span>
      </h2>
      <div className="space-y-4 pl-0 sm:pl-10 border-l-0 sm:border-l border-border-muted/60 sm:ml-3">
        {children}
      </div>
    </section>
  );
}

function P({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-sm sm:text-base text-text-secondary font-light leading-loose ${className}`}>
      {children}
    </p>
  );
}

function Subhead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-base font-semibold text-text-primary mt-6 mb-1 tracking-tight">
      {children}
    </h3>
  );
}

function BulletList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 list-disc list-outside ml-5 text-sm text-text-secondary font-light leading-loose">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-shell-400 bg-surface-2 px-1.5 py-0.5 rounded text-xs font-mono">
      {children}
    </code>
  );
}

function CodeBlock({ lines }: { lines: string[] }) {
  return (
    <pre className="bg-surface-2 border border-border-muted rounded-lg p-4 overflow-x-auto text-xs font-mono text-text-muted leading-loose">
      <code>{lines.join('\n')}</code>
    </pre>
  );
}

function ContactBlock({ entries }: { entries: [string, string][] }) {
  return (
    <div className="rounded-xl border border-border-muted bg-surface-1 divide-y divide-border-muted">
      {entries.map(([label, value]) => (
        <div key={label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3">
          <span className="text-sm text-text-muted uppercase tracking-wider text-2xs">{label}</span>
          <a
            href={`mailto:${value}`}
            className="text-sm font-mono text-shell-400 hover:underline"
          >
            {value}
          </a>
        </div>
      ))}
    </div>
  );
}
