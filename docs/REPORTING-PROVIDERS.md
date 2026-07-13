# Phase 29C — Live Google Reporting Provider Bridges

Server-only bridges for Google Analytics 4 and Google Search Console.
Normalized output feeds the Phase 29B reporting domain. Google is a data source, not the product.

## Flow

```text
Provider APIs
→ lib/reporting/providers (bridges)
→ ReportingFact / MetricSnapshot
→ Business Health / Momentum / Trend / Observations
→ Executive Intelligence adapter / Partnership composition
```

Downstream modules must not import GA4/GSC clients or Google auth.

`lib/live-integrations/ga4.ts` and `search-console.ts` are **thin platform-hub status probes only**. They do not call Google APIs and must not be used for client reporting.

## Required Google Cloud setup

1. Enable APIs on the Google Cloud project:
   - Google Analytics Data API
   - Google Search Console API
2. Prefer a **service account** with read access to each client’s GA4 property and Search Console site.
3. Alternatively use a **reporting-specific OAuth refresh token** with the scopes below.
   - Do **not** reuse `GOOGLE_CALENDAR_REFRESH_TOKEN` — Calendar scopes are different.
   - Existing Calendar tokens do **not** inherit analytics/webmasters scopes; re-consent is required for a new reporting token.

## OAuth scopes

```text
https://www.googleapis.com/auth/analytics.readonly
https://www.googleapis.com/auth/webmasters.readonly
```

## Credential precedence

Exact order (higher wins; invalid higher source does **not** fall through):

1. `GOOGLE_REPORTING_SERVICE_ACCOUNT_JSON` (inline JSON)
2. `GA4_SERVICE_ACCOUNT_JSON` (alias)
3. `GSC_SERVICE_ACCOUNT_JSON` (alias)
4. `GOOGLE_APPLICATION_CREDENTIALS` (filesystem path to JSON)
5. `GOOGLE_REPORTING_CLIENT_ID` + `GOOGLE_REPORTING_CLIENT_SECRET` + `GOOGLE_REPORTING_REFRESH_TOKEN` (all three required)

Malformed or partial service-account configuration → `invalid-configuration` (not OAuth fallback).

Never commit live credentials. Never expose refresh tokens to the browser. Access tokens are never stored on reporting facts.

## Per-client configuration

### Connection (Client Infrastructure)

| Field | Purpose |
| --- | --- |
| `ga4PropertyId` | Numeric GA4 property ID (or `properties/123…`) |
| `searchConsoleSiteUrl` | Exact GSC property: URL-prefix (`https://example.com/`) or domain (`sc-domain:example.com`) — never mutated |

### Entitlements (canonical source of truth)

**Client Experience Profiles → `enabledModules`** (JSON string array).

Reporting IDs are resolved with `getReportingCapabilityIds(enabledModules)` against the Phase 29B vocabulary / partnership capability registry.

Examples: `"website-analytics"`, `"seo"`.

There is **no** `reportingCapabilities` field on Client Infrastructure — that would duplicate entitlements.

Gating:

- GA4 requires `website-analytics`
- Search Console requires `seo`

Both capability **and** property/site configuration must be present before API calls run. Archived clients do not ingest.

## Freshness vs period completeness

| Concept | Meaning |
| --- | --- |
| `freshness: fresh` | Newly retrieved from the provider |
| `freshness: stale` | Served from cache beyond TTL / transient fallback |
| `freshness: missing` | No usable retrieval |
| `periodCompleteness: partial` | Window includes unsettled current day (GA4) |
| `periodCompleteness: delayed` | Effective window clamped for provider lag (GSC) |
| `periodCompleteness: complete` | Closed / settled window |
| warning `partial-period` | Completeness signal (not cache stale) |
| warning `provider-lag` | Search Console lag (not cache stale) |
| warning `stale-cache` | Cache/retrieval stale only |

A freshly fetched GA4 response that includes today is **fresh + partial**, not stale.

## Cache behavior

In-memory, process-local cache keyed by:

`client + provider + encodeURIComponent(property|site) + period + metric-set version`

Success and negative (error) entries are stored separately so rate-limits cannot overwrite the last success.

Approximate TTLs:

- GA4 periods including today: ~15 minutes
- Closed GA4 periods: ~6 hours
- Search Console: ~6 hours
- Provider errors: ~5 minutes (negative cache)

Max ~200 entries per store with FIFO eviction of oldest keys; expired entries removed on read.

Explicit `refresh: true` bypasses cache for that key only.

**The cache reduces duplicate calls within a warm runtime but is not a durable cross-instance cache.**

## Provider lag

- **GA4:** periods that include today emit a `partial-period` warning and medium confidence; retrieval freshness stays `fresh`.
- **Search Console:** ~3-day settled-data clamp; requested vs effective period preserved; `provider-lag` warning always noted.

## Migration

```text
migrations/20260712_phase29c_reporting_provider_connections.ts
```

Adds nullable `search_console_site_url` on `client_infrastructure` only (no default, no capability column).

**Active KXD OS Neon:** this migration has already been applied (batch recorded). Do not invent alternate apply tooling.

**Other environments** (preview, staging, a fresh local DB): use the normal Payload process after confirming the target database:

```bash
npm run migrate
```

Payload may warn about a prior `dev` / push-mode sentinel (`batch = -1`). That warning is unrelated to this additive column; answer deliberately for the confirmed database only.

The migration does not seed property IDs, entitlements, or credentials.

## Live validation status

Google reporting remains **not configured** until:

1. Reporting credentials are set (service account preferred, or reporting OAuth trio)
2. Client Experience Profile `enabledModules` includes `website-analytics` / `seo`
3. Client Infrastructure has `ga4PropertyId` / `searchConsoleSiteUrl`

**No successful live authenticated provider read has been completed yet.** Use `npm run verify:reporting-live` only after those steps; the script never persists reporting facts.

## Live validation (setup)

Diagnostic only — **does not persist facts**, mutate clients, or create reports.

### Select credential mode

Prefer service account:

1. Create a Google Cloud service account.
2. Enable **Google Analytics Data API** and **Google Search Console API**.
3. Download the JSON key.
4. Set `GOOGLE_REPORTING_SERVICE_ACCOUNT_JSON` to the full JSON string (or `GOOGLE_APPLICATION_CREDENTIALS` to the file path).
5. Note the service-account **email** (`client_email`) from the JSON — do not log the private key.

Grant access separately (project ownership is not enough):

- **GA4:** Admin → Property Access Management → add the service-account email as **Viewer**.
- **Search Console:** Settings → Users and permissions → add the same email (Full or Restricted).

OAuth alternative: set all three of `GOOGLE_REPORTING_CLIENT_ID`, `GOOGLE_REPORTING_CLIENT_SECRET`, `GOOGLE_REPORTING_REFRESH_TOKEN` with analytics + webmasters scopes. Do **not** reuse Calendar tokens.

### Property identifier formats

| Field | Format |
| --- | --- |
| GA4 property ID | Digits only, or `properties/123456789` |
| Search Console URL-prefix | Exact prefix, e.g. `https://primalmotorsports.com/` |
| Search Console domain | `sc-domain:primalmotorsports.com` |

### Entitlements

On the client’s Experience Profile `enabledModules`, include:

- `website-analytics` for GA4
- `seo` for Search Console

### Invoke live diagnostic

```bash
# Usage / missing args → exit 1 with instructions (no Google call)
npm run verify:reporting-live

# Readiness only (Payload + entitlements + connection; no Google call)
npm run verify:reporting-live -- --client-slug=primal-motorsports --readiness-only

# Closed historical month (prefer ending before today)
npm run verify:reporting-live -- \
  --client-id=<id> \
  --provider=ga4 \
  --start=2026-06-01 \
  --end=2026-06-30
```

Default rejects periods that include today. Pass `--allow-partial-period` only when intentionally testing unsettled data.

### Interpreting status

| Status / signal | Meaning |
| --- | --- |
| `connected` | Authenticated read succeeded; facts may include legitimate zeros |
| `no-rows` | Authenticated success with empty activity (not failure) |
| `not-configured` | Missing credentials or property/site |
| `unauthorized` | Revoked/invalid credentials |
| `forbidden` | Authenticated but property/site access denied, or client ineligible |
| `rate-limited` | Provider quota; retry later |
| `invalid-configuration` | Malformed credentials or property id |
| `capability-disabled` | Entitlement missing — do not bypass |
| `fresh` | Newly retrieved |
| `stale` | Cache/TTL fallback only |
| `partial` | Period includes unsettled current day |
| `delayed` | Search Console lag clamp on effective period |

The script always prints:

```text
This command performed a live provider read.
No reporting facts were persisted.
```

(when a live read ran; readiness-only states that no Google calls were made.)

## Verification (no live credentials required)

```bash
npm run verify:reporting-providers
npm run verify:reporting-domain
```

## Entry points

```ts
import {
  ingestClientReporting,
  ingestClientReportingProvider,
  composeReportingFromProviderResults,
} from "@/lib/reporting";
```
