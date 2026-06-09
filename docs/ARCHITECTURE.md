# KXD Rebuild — Architecture

## Overview

Monolithic Next.js 16 application with Payload CMS 3 embedded. Public marketing site and CMS admin share one codebase, one deployment, and one database — architected for future KXD OS integration without rebuild.

```
kxd-rebuild/
├── app/
│   ├── (site)/          # Public marketing site
│   └── (payload)/       # Payload admin + REST API
├── components/          # React UI
├── design-system/       # Design tokens and principles
├── docs/                # Strategy and architecture documentation
├── lib/
│   ├── analytics/       # GA4, GTM preparation
│   ├── inquiries/       # Inquiry routing
│   ├── kxd-os/          # Future OS integration contracts
│   ├── seo/             # Metadata, schema, sitemap
│   └── stripe/          # Future payment architecture
└── payload/
    ├── access/          # Collection access control
    ├── collections/     # CMS collections
    ├── fields/          # Shared field definitions
    └── hooks/           # Collection lifecycle hooks
```

## Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 16 App Router | SSR/SSG, SEO, API routes, Payload native integration |
| CMS | Payload CMS 3 | Type-safe collections, Lexical editor, self-hosted |
| Database | PostgreSQL (prod) / SQLite (dev) | Same adapter pattern as KXD client platforms |
| Styling | Tailwind CSS 4 + CSS tokens | Design system parity across KXD projects |
| Payments | Stripe (prepared) | Deposits, packages, discovery calls |
| Analytics | GA4 + GTM (prepared) | Search Console verification support |

## Route Architecture

### Public (`app/(site)/`)

| Route | Purpose |
|-------|---------|
| `/` | Homepage — luxury websites primary |
| `/work` | Portfolio index |
| `/services` | Service overview |
| `/services/[slug]` | Individual service pages |
| `/platforms` | Platform capabilities |
| `/pricing` | Investment tiers |
| `/insights` | Editorial / blog |
| `/about` | Studio story |
| `/contact` | Inquiry conversion |

### Admin (`app/(payload)/`)

| Route | Purpose |
|-------|---------|
| `/admin` | Payload CMS admin panel |
| `/api/*` | Payload REST API |

### Future (reserved, not built)

| Route | Purpose |
|-------|---------|
| `/portal/*` | Client portals |
| `/dashboard/*` | Operational dashboards |
| `/ops/*` | Internal workspace |

## Payload Collections

| Collection | Purpose |
|------------|---------|
| `projects` | Portfolio entries with galleries and project types |
| `case-studies` | Long-form proof: challenge, strategy, execution, results |
| `services` | CMS-managed service pages |
| `testimonials` | Curated client quotes |
| `reviews` | 4.5+ rated reviews, Google sync prepared |
| `partners` | Technology and industry partners |
| `team-members` | Studio team |
| `insights` | Editorial content for SEO |
| `inquiries` | Website form submissions → matt@kreatebydesign.com |
| `platform-applications` | Platform/enterprise qualification |
| `media` | Upload library with responsive sizes |
| `users` | Admin authentication |

## Data Flow

```
Visitor → (site) → Inquiry form → Payload `inquiries`
                                      ↓
                              Notification hook
                                      ↓
                         matt@kreatebydesign.com
                                      ↓
                              [Future: KXD OS CRM]
```

## Integration Boundaries

### KXD OS (future)

- Website writes leads to Payload collections
- KXD OS reads via shared database or REST API (`KXD_OS_API_BASE_URL`)
- `kxdOs` field groups on inquiries/applications hold sync references
- No OS UI built in this phase

### Stripe (future)

- Metadata contract defined in `lib/stripe/config.ts`
- Inquiry records include `stripe` group for payment state
- Checkout sessions for: discovery deposits, project deposits, packages

### Google Reviews (future)

- Reviews managed in Payload
- Public API filters to 4.5+ stars only
- `externalSync` group on reviews for GBP automation
- Review schema generated from published reviews

## Environment

Copy `.env.example` to `.env.local`. SQLite is used automatically when `DATABASE_URI` is unset.

## Development

```bash
npm install
npm run dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin
