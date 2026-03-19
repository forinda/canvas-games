# Security Policy

## Scope

Canvas Game Arcade is a **client-side-only** static web application. There is no backend server, database, authentication, or user accounts. All data stays in the browser.

### What We Store

| Data | Where | Sensitivity |
|------|-------|-------------|
| High scores | `localStorage` | Low — per-browser, not transmitted |
| Game progress (Idle Clicker, Fishing catalog) | `localStorage` | Low — game state only |
| User preferences | `localStorage` | Low — no PII |

**We do NOT collect, transmit, or store:**
- Personal information (name, email, IP)
- Analytics or telemetry
- Cookies or session tokens
- Any data to external servers

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest (`main` branch) | Yes |
| Tagged releases (`v1.x.x`) | Yes |
| Older than latest tag | No |

## Reporting a Vulnerability

If you find a security issue, please report it responsibly.

### How to Report

1. **DO NOT** open a public GitHub issue for security vulnerabilities
2. Email: **[your-email@example.com]** (replace with your actual email)
3. Or use [GitHub Security Advisories](https://docs.github.com/en/code-security/security-advisories) if the repo is on GitHub

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

| Step | Timeline |
|------|----------|
| Acknowledgment | Within 48 hours |
| Assessment | Within 1 week |
| Fix released | Within 2 weeks for critical issues |

## Security Considerations

### Client-Side Risks

Since this is a browser-only application, the primary risks are:

#### 1. Cross-Site Scripting (XSS)

**Risk:** Low — the app uses Canvas API for rendering, not DOM/innerHTML.

**Mitigations:**
- No `innerHTML` or `document.write` usage anywhere
- No user-generated HTML content
- All rendering through Canvas 2D context (`fillText`, `fillRect`, etc.)
- No templating engines or HTML string construction

#### 2. Prototype Pollution

**Risk:** Low — no `Object.assign` with untrusted input.

**Mitigations:**
- Game state is constructed from known factory functions
- No deserialization of arbitrary JSON from external sources
- `localStorage` reads are wrapped in `try/catch` with fallback defaults

#### 3. localStorage Manipulation

**Risk:** Low — game scores only, no security implications.

**Mitigations:**
- All `localStorage.getItem` calls use `try/catch`
- Invalid data falls back to defaults (score = 0)
- No sensitive data stored
- Stored data is never used for access control

#### 4. Dependency Supply Chain

**Risk:** Low — minimal dependencies.

**Current dependencies (production):** None — zero runtime dependencies.

**Dev dependencies only:**
- `typescript` — Microsoft
- `vite` — Vite team
- `eslint` + plugins — ESLint team
- `prettier` — Prettier team
- `husky` + `lint-staged` — community maintained

**Mitigations:**
- No runtime dependencies (pure TypeScript + Canvas API)
- `pnpm-lock.yaml` pins exact versions
- Dev dependencies don't ship in production build
- Regular `pnpm audit` recommended

#### 5. Content Security Policy (CSP)

If deploying behind a web server, use this CSP header:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none';
```

This blocks:
- External script loading
- External data connections
- Inline script injection (except styles needed for canvas)

## Security Checklist for Contributors

When adding a new game or feature:

- [ ] **No `innerHTML` or `document.write`** — use Canvas API only
- [ ] **No `eval()` or `Function()`** — never execute dynamic strings
- [ ] **No external HTTP requests** — the app is fully offline-capable
- [ ] **`localStorage` reads wrapped in try/catch** — handle corrupt data gracefully
- [ ] **No user input in `localStorage` keys** — use fixed string constants
- [ ] **No `postMessage` to external origins** — no cross-frame communication
- [ ] **Validate parsed data** — don't trust `JSON.parse(localStorage.getItem(...))` blindly
- [ ] **No secrets in source code** — no API keys, tokens, or credentials

## Auditing

Run dependency audit periodically:

```bash
pnpm audit
```

Check for known vulnerabilities in dev dependencies. Since there are zero production dependencies, the attack surface is minimal.

## Build Verification

The production build (`dist/`) contains only:
- `index.html` — static HTML shell
- `assets/index-*.css` — minimal CSS
- `assets/index-*.js` — bundled TypeScript (tree-shaken, minified)

No server-side code, no environment variables, no API endpoints.

```bash
# Verify build contents
pnpm build
ls -la dist/
# Should only contain: index.html, assets/
```

## License

This security policy applies to the Canvas Game Arcade project. See [LICENSE](./LICENSE) for project licensing.
