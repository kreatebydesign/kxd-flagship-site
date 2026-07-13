# KXD OS Runtime Architecture

**Phase 30A · Architecture Review (Edition 1)**
**Phase 30B · Runtime Contract (Edition 1)** — `lib/runtime/`
**Status:** Architecture + runtime contract landed; no Tauri/Electron packaging
**Baseline commit:** `018057e` — `feat(reporting): add live GA4 and Search Console provider bridges`
**Companion docs:** `docs/KXD-OS-ARCHITECTURE.md`, `docs/KXD-OS-PHILOSOPHY.md`, `docs/KXD-OS-VISUAL-MANIFESTO.md`

> **30B correction:** Phase 30A wording that implied a “local/bundled Node Shared Core” as the desktop data plane is **withdrawn**. The desktop shell is not a second backend. Canonical authority remains the remote authenticated KXD OS server (Next.js + Payload + Neon).

---

## Mission

Transform KXD OS from a browser-hosted Next.js application into **premium desktop software** while preserving:

- one codebase
- Shared Core (Payload + loaders)
- KXD Agency OS as Edition 1
- browser support as a first-class fallback
- Client Portal compatibility
- no Organizations / no multi-tenancy

Target endpoints:

| Surface | Destination |
| --- | --- |
| Studio OS (founder / operators) | macOS app + Windows app + browser |
| Client Portal (CES) | Browser-first; optional future desktop companion |
| Public marketing site | Browser only |
| Payload CMS admin | Embedded or linked; not the primary desktop experience |

This phase designs the permanent runtime architecture. It does **not** install Tauri/Electron, package binaries, or modify Reporting, Executive Intelligence, Scheduling, or Client Experience.

---

## 1. Architecture Document

### 1.1 Current Runtime Reality (inspected)

KXD OS today is a **monolithic Next.js 16 App Router** application with embedded **Payload CMS 3**, deployed primarily on **Vercel**, backed by **Neon PostgreSQL**.

#### Surfaces in one deployment

| Surface | Routes | Auth |
| --- | --- | --- |
| Public marketing | `app/(site)/*` | None |
| Payload CMS | `/admin/[[...segments]]`, `/api/[...slug]` | Payload JWT cookies |
| KXD OS operations | `/admin/operations/*`, `/os`, `/admin/work/*`, `/admin/sales/*` | Payload admin via `requirePayloadAdminPage()` |
| Client Portal (CES) | `/portal/*` | Custom HMAC cookie `kxd-portal-session` |
| Junior Creators | `/junior-creators/*` | Custom HMAC cookie |
| Public proposal | `/proposal/[publicToken]` | Token in URL |

#### Critical runtime facts

- Authenticated layouts are `force-dynamic` + `runtime = "nodejs"` — **Node.js server required**.
- ~175 `server-only` modules hold business logic, auth, Google, reporting, intelligence.
- Client UI uses React Context + `localStorage` / `sessionStorage` — no Redux/Zustand.
- Inter-UI coordination uses a **window CustomEvent bus** (`kxd:command-palette-open`, notifications, quick-create, etc.).
- Command palette (`Cmd/Ctrl+K`) already exists for admin ops.
- Notifications are in-app drawers with on-demand fetch — **no OS push**, no service workers, no PWA.
- Uploads: Payload Media + Client Review Media via Vercel Blob or local adapter.
- Portal host middleware assumes `portal.kreatebydesign.com` for root redirect.
- Visual manifesto already aspires to **macOS Finder / Xcode / System Settings** language — not a dashboard.

#### What already feels “desktop”

- Space Black Titanium OS chrome (`design-system/os/`)
- Executive workspace shell + workspace memory
- Command palette + activity/notifications entry points
- Ritual modes (Brief / Focus / Review)
- Edition/module gating (`lib/editions/`)

#### What is still browser-first

- Cookie sessions and subdomain routing
- Single-window CustomEvent bus
- Vercel Blob and Lambda cold-start assumptions
- Absolute URL generation via `NEXT_PUBLIC_SITE_URL` / `PORTAL_PUBLIC_URL`
- No offline model, no native menus, no updater, no secure OS keychain

---

### 1.2 Permanent Runtime Model (corrected in 30B)

```text
┌─────────────────────────────────────────────────────────────┐
│  Desktop Shell (native · Tauri future)                       │
│  window chrome · menus · shortcuts · OS notifications        │
│  updater · deep links · keychain · file dialogs              │
│  NO business authority · NO Neon · NO Payload adapter        │
└───────────────────────────┬─────────────────────────────────┘
                            │ allowlisted IPC bridge
┌───────────────────────────▼─────────────────────────────────┐
│  Application Web Runtime (system WebView)                    │
│  Same Next.js App Router UI as browser                       │
│  lib/runtime adapter (web today · native later)              │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS (authenticated cookies)
┌───────────────────────────▼─────────────────────────────────┐
│  Canonical Shared Core (ONE remote authority)                │
│  Next.js · Payload · loaders · intelligence · APIs           │
│  Neon PostgreSQL (system of record)                          │
│  Hosted (e.g. Vercel) — same backend browser users hit       │
└─────────────────────────────────────────────────────────────┘
```

#### Authority boundaries (non-negotiable)

| Layer | May include | Must NOT |
| --- | --- | --- |
| **Bundled presentation / runtime assets** | WebView chrome, static UI assets, shell binaries, native adapters | Business mutations, Payload, Neon |
| **Remote canonical application services** | Authenticated Next/Payload APIs, Shared Core loaders | Be reimplemented inside Tauri |
| **Optional local cache** | Read-only UI snapshots, device settings, workspace memory | Become system of record; accept offline writes as truth |
| **Forbidden local authority** | — | Local Payload server, local Neon replica as authority, desktop-owned business records, migrate-at-launch, second auth system, duplicated API routes, secrets baked into the binary, direct DB access from Tauri |

**Invariant:** One Shared Core. One Payload. One Neon. One authentication system. The desktop shell is presentation + native capability adapters only. **No second backend.**

#### Product split (intentional)

| Product | Runtime priority | Rationale |
| --- | --- | --- |
| **KXD Studio OS** | Desktop primary, browser fallback | Founder daily instrument |
| **Client Portal** | Browser primary | Clients should not install agency software |
| **Marketing site** | Browser only | Public web |

Desktop packaging **scopes to Studio OS routes** (`/admin/operations`, `/os`, `/admin/work`, `/admin/sales`, related APIs). Portal remains web. Deep links may open Portal in the system browser.

---

### 1.3 Runtime Shell

The shell is a thin native host:

| Responsibility | Shell | WebView app | Remote Shared Core |
| --- | --- | --- | --- |
| Window frame, traffic lights, title | ✓ | | |
| Native menu bar | ✓ | Commands via runtime adapter | |
| Global shortcuts (beyond in-app) | ✓ | In-app Cmd+K | |
| OS notifications | ✓ | | Notification domain APIs |
| Device keychain (non-password) | ✓ | | |
| File open/save dialogs | ✓ | via `lib/runtime` | Authenticated upload/download APIs |
| Auto-updater | ✓ | | |
| Embedding WebView | ✓ | | |
| Session cookies | WebView jar | | Payload / portal auth |
| Business logic, Payload, intelligence | | | ✓ |
| Rendering workspaces | | ✓ | |

**Principle:** Shell has no business domain knowledge. It speaks the allowlisted bridge in `lib/runtime/bridge.ts`. Application code never imports Tauri.

---

### 1.4 Workspace Model

Map existing Executive workspaces to a desktop workspace model without inventing parallel navigation.

| Desktop concept | Current source |
| --- | --- |
| Primary workspace | Executive workspaces / operations routes |
| Ritual workspaces | Brief, Focus, Review |
| Domain workspaces | Clients, Work, Intelligence, Sales, Scheduling |
| Client HQ | Remains browser Portal (out of Studio shell) |
| Settings | New native + in-app Application Settings |

Workspace memory (`kxd-executive-workspace:*` in localStorage) becomes **shell-persisted workspace state** (still per-user, still UI-only).

---

### 1.5 Window Model

**Edition 1 desktop (30B–30D):** single primary window.

| Mode | Behavior |
| --- | --- |
| Main window | Full Studio OS |
| Optional utility window (later) | Focus Mode or Command Palette as floating panel |
| Multi-window (future) | Separate client preview, proposal review — requires IPC event bus replacement |

**Rule:** Until multi-window exists, keep CustomEvents. When multi-window lands, replace window bus with shell-mediated event bridge — do not fork UI logic.

---

### 1.6 Internal Routing

Preserve Next.js App Router paths inside the WebView:

```text
kxdos://operations/today
     → https://<canonical-host>/admin/operations/today
```

| Concern | Decision |
| --- | --- |
| Pathnames | Unchanged relative routes (canonical) |
| Host in desktop | **Remote canonical application origin** (same Shared Core as browser) |
| Host in browser | Existing Vercel deployment |
| Portal host middleware | Portal stays on web host; Studio desktop does not host Portal |
| Auth redirects | `/admin/login?redirect=` against the canonical remote host |
| Deep links | Validated by `lib/runtime/deep-links.ts`; protocol registration later |

**Withdrawn (30A ambiguity):** loopback to a bundled Node/Payload server as the Studio host. Dev-only local `next dev` remains an engineering tool — not a desktop authority model.

---

### 1.7 Global Navigation

Desktop navigation layers:

1. **Native menu** — File / Edit / View / Go / Window / Help
2. **In-app header** — existing ExecutiveHeader
3. **Command palette** — existing Cmd+K (Raycast speed)
4. **Sidebar** (optional future polish) — must not become a generic admin sidebar; prefer Apple System Settings / Finder restraint

Do not add a second nav system. Native menu items invoke the same navigation targets as header + palette.

---

### 1.8 Command Palette, Global Search, Quick Actions

Already present for admin ops. Permanent architecture:

| Capability | Current | Desktop evolution |
| --- | --- | --- |
| Command palette | Command palette + `/api/admin/command-search` | Keep; shell may bind global hotkey even when unfocused |
| Recents / pins | localStorage | Migrate to shell preferences store when packaged |
| Quick create | CustomEvent `kxd:quick-create-open` | Menu + palette + shortcut |
| Activity / notifications | CustomEvents + APIs | Native notification click focuses app + opens panel |

**Raycast standard:** palette is the primary power user path; menus mirror, never diverge.

---

### 1.9 Native Notifications

| Layer | Role |
| --- | --- |
| Core | Existing notification domain + `/api/admin/notifications` |
| Shell | OS notification center (macOS / Windows) |
| Bridge | Push only high-signal events (critical activity, scheduling conflicts, approval needed) |

No spam. Founder calm > completeness. Clicking a native notification deep-links into the relevant workspace.

---

### 1.10 Secure Credential Storage

| Secret class | Today | Desktop |
| --- | --- | --- |
| Payload session cookie | Browser cookie jar | WebView cookie jar + optional keychain backup of refresh material if introduced |
| Google reporting / Calendar env secrets | Server env on canonical host (Vercel) | Remain on the **remote** server only — never copied into the desktop binary or renderer |
| Portal sessions | N/A in Studio desktop | Portal remains browser |
| Future device unlock / OAuth refresh (optional) | — | OS keychain via secure-storage capability — never passwords, never Neon URLs |

**Rule:** Renderer never holds long-lived API secrets. Desktop is not a secret distribution channel for Shared Core env.

---

### 1.11 Offline Awareness

Edition 1 desktop is **online-first** (Shared Core on Neon).

| Level | Scope |
| --- | --- |
| L0 (ship) | Detect offline; calm banner; disable mutating actions; allow reading last successful UI shell |
| L1 (later) | Cache read-only snapshots for Today / Brief |
| L2 (future) | Optional read cache only — **never** a second system of record |

Do not pretend full offline CRM. No offline business mutations. Truthful degradation only (`lib/runtime/connectivity.ts`).

---

### 1.12 File System, Downloads, Uploads

| Concern | Architecture |
| --- | --- |
| Review uploads | Keep adapter pattern (`vercel-blob` \| `local`); desktop defaults to local or private object store |
| Save / export | Shell save dialogs → stream from Core |
| Open with | Shell open dialogs → Core ingest endpoints |
| Downloads | Explicit download manager in shell for large exports (reports, PDFs) |

---

### 1.13 Background Sync & Updater

| System | Design |
| --- | --- |
| Background sync | Core polls / webhooks unchanged; shell may keep app awake for calendar sync windows |
| Updater | Shell-native auto-update (signed releases); channels: `stable`, `beta` |
| Migration | Schema migrations remain Payload CLI / release-time — never silent destructive migrate on launch |

---

### 1.14 Application Lifecycle

```text
Launch → optional device unlock (keychain) → open WebView to canonical remote Studio URL
  → existing Payload session cookie / login flow
  → shell menus bind · runtime adapter initializes (no permission prompts)
Suspend → reduce polling
Resume → refresh session + connectivity probe
Quit → tear down WebView; no local database shutdown (there is none)
```

Cold start must feel intentional, not like a web page loading. Splash: restrained brand mark, no dashboard skeleton spam.

---

### 1.15 Deep Linking & App Protocol

| Scheme | Example | Action |
| --- | --- | --- |
| `kxdos://` | `kxdos://operations/today` | Focus app, route internally |
| `kxdos://` | `kxdos://work/<id>` | Open work detail |
| HTTPS | `https://kreatebydesign.com/admin/operations/...` | Browser; optional “Open in KXD OS” |

Register protocol on install. Validate paths against an allowlist — no open redirects into arbitrary hosts inside WebView.

---

### 1.16 Auto Launch, Permissions, Native Menu

- **Auto launch:** optional, off by default (founder control).
- **Permissions:** notifications, calendar (if OS-level later), files, camera only if a feature needs it — request just-in-time.
- **Native menu:** curated, sparse, KHIG-aligned labels — not a dump of every route.

---

### 1.17 Application Settings

In-app Settings workspace + native Preferences:

| Section | Contents |
| --- | --- |
| Account | Signed-in operator, logout |
| Appearance | Theme density (within OS tokens) |
| Notifications | Native + in-app toggles |
| Calendar | Connection status (existing Google Calendar) |
| Data | Connection status to Shared Core / Neon |
| Updates | Channel, last check |
| Advanced | Canonical host URL, diagnostics, contract version |

---

### 1.18 Release Channels, Signing, Notarization

| Platform | Requirement |
| --- | --- |
| macOS | Developer ID Application signing + **notarization** |
| Windows | Authenticode signing (trusted cert) |
| Linux | Feasible as secondary (AppImage/Flatpak) — not Edition 1 priority |

Channels: `stable` (default), `beta` (internal).

---

### 1.19 Browser Fallback & Portal Compatibility

| User | Experience |
| --- | --- |
| Founder without install | Full Studio OS in browser (current) |
| Founder with desktop | Same Core UX, native shell advantages |
| Client | Portal in browser only |
| Auth | Same Payload admin auth for Studio; portal HMAC unchanged |

Desktop must not break browser. Feature flags may enable shell-only capabilities (native notifications, keychain) without forking business logic.

---

### 1.20 Authentication Strategy (Studio Desktop)

1. Operator opens app → Core serves `/admin/login` if no Payload session.
2. Login establishes Payload cookie in WebView cookie store (httpOnly).
3. Optional: shell stores a device-bound unlock (biometric) that unlocks keychain secrets for server env injection — **not** a second identity system.
4. Logout clears WebView cookies + optional keychain session material.

Do not invent OAuth-for-desktop as a parallel identity. Shared Core identity remains Payload Users.

---

## 2. Migration Strategy

### Principle

**Wrap, don’t rewrite.** Shared Core and App Router stay. Introduce a shell around them.

### Stages

```text
A. Architecture freeze (30A)
B. Runtime contract (30B) ← lib/runtime + corrected authority model
C. Desktop host prototype — WebView loads remote canonical Studio; single window
D. Shell integration — menu, shortcuts, deep links, notifications
E. Packaging & update — signed macOS
F. Windows parity
G. Hardening — offline L0/L1 UI awareness, download manager, settings
H. Browser parity audit + Portal isolation confirmation
```

### Compatibility rules

1. No duplicate intelligence, reporting, or scheduling stacks.
2. No separate desktop database as system of record.
3. URL pathnames remain stable for deep links and muscle memory.
4. `server-only` boundaries preserved — never move secrets into renderer.
5. CustomEvent bus remains for product UI until multi-window; runtime events use `lib/runtime/events`.
6. Portal host assumptions stay web-side.
7. Desktop never runs Payload/Neon locally as authority.

### Data & env migration

| Concern | Approach |
| --- | --- |
| Neon | Remains sole production system of record (remote) |
| Secrets | Stay on canonical server env; device keychain only for non-authority device material |
| Blob | Keep adapter; desktop uses authenticated download/save via runtime contract |
| Migrations | Payload CLI / release-time only — **never** at application launch |

---

## 3. Implementation Phases

| Phase | Title | Outcome |
| --- | --- | --- |
| **30A** | Runtime Architecture | This document — decision + blueprint |
| **30B** | Runtime Contract | `lib/runtime/` — adapter, web implementation, bridge allowlist, events, datetime, connectivity, deep links, files, settings ownership. **Complete.** |
| **30C** | Desktop Host Prototype | macOS Tauri shell (or approved host); WebView loads **remote** canonical Studio; single window; Payload login works; no local Payload |
| **30D** | Shell Integration | Native menu, global shortcut, deep link scheme registration, notification bridge (opt-in) |
| **30E** | Packaging & Update | Signed macOS build, notarization pipeline, updater channel |
| **30F** | Windows Parity | Windows host + Authenticode + updater |
| **30G** | Desktop Polish | Offline L0/L1 awareness UI, download manager, settings, permission UX, performance pass |
| **30H** | Browser & Portal Certification | Prove browser Studio unchanged; Portal untouched; no regression in Shared Core |

**Out of scope until requested:** multi-window, full offline replica, Linux primary support, Portal-as-desktop.

---

## 4. Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Shipping a second backend | High | Hard rule: one Shared Core |
| Electron weight / memory | High | Prefer Tauri (see §7) |
| Cookie / WebView session quirks | Medium | Integration tests for login/logout |
| CustomEvent bus vs multi-window | Medium | Delay multi-window; plan IPC event bus |
| Neon dependency / offline expectations | Medium | Truthful offline L0 only |
| Portal middleware host checks | Low | Keep Portal web-only |
| Signing / notarization delays | Medium | Start Apple/Windows cert process early in 30E |
| Scope creep into Portal desktop | High | Explicit product split |
| Vercel Blob in desktop | Low | Adapter already exists |
| Treating Payload `/admin` CMS as the product shell | High | Studio OS routes are the product; CMS remains tool |

---

## 5. Performance Considerations

| Area | Target |
| --- | --- |
| App ready to interactive | < 3s on Apple Silicon after warm start |
| Cold Core boot | Optimize Next/Payload startup; avoid running migrations at launch |
| Memory | Prefer Tauri/system WebView over full Chromium-per-app where possible |
| UI | Preserve existing calm transitions; no dashboard widget spam |
| Network | Desktop should not chat more than browser; reuse existing loaders |
| Assets | Bundle only Studio OS; exclude marketing site weight from desktop package where feasible |

Figma polish means **perceived** speed: instant shell chrome, progressive Core content — never a blank white WebView.

---

## 6. Security Review

| Topic | Position |
| --- | --- |
| Threat model | Stolen laptop, malicious deep link, XSS in WebView, token theft |
| Sessions | Keep httpOnly cookies; lock down WebView navigation allowlist |
| Secrets | OS keychain; never log; never commit |
| IPC | Typed, allowlisted commands; no `eval` bridges |
| Deep links | Path allowlist only |
| Updates | Signed artifacts only; HTTPS update feed |
| CSRF | Existing SameSite=lax + server auth gates remain |
| Portal isolation | Portal credentials never enter Studio desktop keychain |
| Reporting / Google tokens | Remain server-side only (unchanged architecture) |
| Code signing | Mandatory before public distribution |

---

## 7. Recommended Runtime

### Evaluation

| Option | Fit | Verdict |
| --- | --- | --- |
| **Tauri 2** | Small Rust shell, system WebView, strong packaging, good IPC, lower memory | **Recommended** |
| Electron | Mature ecosystem, heavier Chromium, higher RAM, “admin tool” association | Acceptable fallback only if Tauri blocks a hard requirement |
| Neutralino | Lightweight but weaker packaging/signing/updater maturity for premium commercial apps | Reject for Edition 1 desktop |
| Pure native Swift/WinUI rewrite | Violates one-codebase / Shared Core | Reject |
| PWA only | No true native menu/keychain/updater quality bar | Reject as primary |

### Recommendation

**Tauri 2** as the permanent desktop runtime for KXD Studio OS.

### Justification

1. Aligns with Apple restraint and premium craft — smaller footprint than Electron.
2. Preserves one Web Core (Next + Payload) without a native UI rewrite.
3. First-class path to macOS signing/notarization and Windows packaging.
4. IPC model fits a thin shell around Shared Core.
5. Avoids “Electron admin dashboard” product smell.

### Tradeoffs

| Pro | Con |
| --- | --- |
| Lower memory vs Electron | System WebView differences (Safari WebKit on macOS vs WebView2 on Windows) require dual QA |
| Smaller installers | Rust toolchain in CI |
| Strong security defaults | Some Electron plugins won’t exist — write thin bridges |
| Fits KHIG desktop aspiration | Team must learn Tauri app lifecycle |

**Electron is explicitly not preferred** unless Tauri cannot meet a non-negotiable capability after 30C prototype.

---

## 8. Future Expansion

- Multi-window Focus / Client preview
- Offline L1–L2 (optional **read-only** cache — never a second Neon)
- Linux packages for internal engineering
- `kxdos://` links from Portal emails (“Open in Studio”)
- Native calendar alerts layered on Google Calendar sync
- Raycast/Alfred extension that speaks `kxdos://` (not a second backend)
- Optional Studio widget (macOS) for Next Action only — never a metric dashboard

---

## 9. Estimated Implementation Effort

Rough founder-caliber engineering effort (one senior full-stack + intermittent native help):

| Phase | Effort |
| --- | --- |
| 30A Architecture | Done |
| 30B Runtime contract | Done (`lib/runtime/`) |
| 30C macOS host prototype | 2–4 weeks |
| 30D Shell integration | 2–3 weeks |
| 30E Packaging / notarization / updater | 2–4 weeks (calendar time for Apple review/certs) |
| 30F Windows parity | 2–3 weeks |
| 30G Polish | 2–3 weeks |
| 30H Certification | 1–2 weeks |

**Calendar estimate to polished macOS internal beta:** ~3–5 months elapsed.
**Windows stable after macOS beta:** +4–8 weeks.

Not a rewrite of KXD OS — a thin native shell around the remote Shared Core.

---

## 10. Final Recommendation

1. **Adopt Tauri 2** as the Studio OS desktop shell (packaging later).
2. **Keep remote Shared Core + App Router** as the sole product brain and API authority.
3. **Desktop-primary for Studio; browser-fallback forever; Portal stays web.**
4. **30B complete** — use `lib/runtime/` for all host capabilities; never import Tauri from app code.
5. **Do not** install Tauri until 30C prototype is authorized.
6. **Do not** modify Reporting, Executive Intelligence, Scheduling, or CES for runtime work.
7. **Protect architecture:** shell is chrome; remote Core is truth; no local Payload authority.

### Design north stars (non-negotiable)

- Apple restraint
- Linear clarity
- Raycast speed
- Figma polish
- No generic admin dashboards
- No browser-first thinking in shell UX
- No duplicate codebases or backends

---

## 11. Phase 30B — Runtime Contract (landed)

### Module

`lib/runtime/` — framework-neutral contract:

| File | Role |
| --- | --- |
| `types.ts` | `KxdRuntimeKind`, capabilities vocabulary |
| `adapter.ts` | `KxdRuntimeAdapter` interface |
| `adapters/web.ts` | Truthful browser adapter |
| `bridge.ts` | Future native allowlist (no Tauri install) |
| `registry.ts` / `initialize.ts` | Single active adapter |
| `provider.tsx` | Optional React provider (Portal may omit) |
| `events.ts` | Typed runtime events |
| `datetime.ts` | UTC storage + timezone precedence |
| `connectivity.ts` | online / offline / reconnecting / degraded / unknown |
| `auth.ts` | Session rules — no parallel desktop account |
| `deep-links.ts` / `navigation.ts` | `kxdos://` + external URL validation |
| `files.ts` | Download/save contract + filename sanitization |
| `settings.ts` | server / device / secure-device / session ownership |
| `errors.ts` | Structured results — never silent failure |

Verify: `npm run verify:runtime-contract`

### Date/time debt

`EXECUTIVE_INTELLIGENCE_FOOTER_TIMEZONE_DEBT` documents that EI/brief footers must migrate to `resolvePresentationTimezone` + `formatInTimezone` — not fixed in 30B.

### Testing

- Runtime/capability detection
- Unsupported structured responses
- External URL + deep-link validation (including encoded traversal)
- Timezone precedence + date-only safety
- Connectivity + mutation attempt policy
- Filename sanitization
- Bridge allowlist + absence → unavailable
- Spoofed globals cannot elevate runtime kind

### Provider placement (Phase 30C)

Do **not** mount `RuntimeProvider` at the root layout.

Recommended boundary:

`app/admin/operations/layout.tsx` — client island wrapping Studio ops children only

Rules:

- Preserve server components above the provider
- Portal layouts remain browser-first and provider-free
- Browser Studio uses the same web adapter
- Root `app/layout.tsx` stays free of runtime client state

---

## Appendix A — Current Inventory (research anchors)

| Area | Location |
| --- | --- |
| Middleware / portal host | `middleware.ts`, `lib/portal/constants.ts` |
| Admin auth | `lib/admin/auth.ts` |
| Portal session | `lib/portal/session.ts` |
| Ops shell | `components/admin/operations/` Executive shell family |
| Command palette | Admin command palette + `/api/admin/command-search` |
| Notifications | Notification center + `/api/admin/notifications` |
| Workspace memory | localStorage via WorkspaceMemory provider |
| Review media storage | `lib/client-review-media/storage/` |
| Platform timezone (existing) | `lib/platform/timezone.ts` |
| **Runtime contract (30B)** | `lib/runtime/` |
| Platform registry | `lib/platform/registry.ts` |
| Editions | `lib/editions/` |
| OS visual system | `design-system/os/`, Visual Manifesto |

### Browser assumptions that complicate a native shell (inspected)

- Cookie + subdomain auth (`PORTAL_HOST`, Payload JWT cookies)
- `window` CustomEvent bus for palette / quick-create / composers
- `localStorage` / `sessionStorage` for workspace memory, search recents, CES pins
- Absolute URL helpers (`NEXT_PUBLIC_SITE_URL`, `PORTAL_PUBLIC_URL`)
- No service worker / PWA today (good — no competing offline stack)
- `force-dynamic` + Node `server-only` modules require remote Node authority (not a desktop binary)

## Appendix B — Explicit Non-Goals (30A / 30B)

- No Tauri/Electron/Rust install
- No packaging or release binaries
- No native windows
- No UI redesign
- No Reporting / EI / Scheduling / CES business logic changes
- No local Payload / Neon authority
- No commits / pushes unless later requested

---

**Phase 30A + 30B complete.** Next authorized step: **Phase 30C — Desktop Host Prototype** (remote WebView; still no second backend).
