# KXD SEO Strategy

## Objective

Establish Kreate by Design as an organic search leader for **national specialized acquisition** — premium websites, growth infrastructure, and operational platforms — with selective legitimate Southern California equity. Luxury/premium craft remains a quality signal, not a generic “local web design agency” identity.

**Acquisition frame:** national-first. California / Los Angeles may appear as factual studio context. Do **not** target Portland, Oregon, Roseburg, PNW, or Beverly Hills as acquisition markets.

## Priority Keywords

| Keyword | Target Page |
|---------|-------------|
| Luxury Website Design | `/`, `/services/luxury-website-experiences` |
| Premium Website Design | `/`, `/services` |
| Hospitality Website Design | `/work`, `/insights` |
| Motorsports Website Development | `/work`, `/insights` |
| Membership Platform Development | `/platforms`, `/services/enterprise-platforms` |
| Operational Platform Development | `/platforms` |
| Client Portal Development | `/platforms`, `/services/enterprise-platforms` |
| Enterprise Website Development | `/services/enterprise-platforms` |
| California Premium Web Design | `/`, `/about` (supporting equity only) |

**Do not target as KXD acquisition keywords:** Portland Web Design Agency, Oregon Web Design Agency, Roseburg, PNW / Pacific Northwest, Beverly Hills agency, Los Angeles Web Design Agency as primary identity.

## Technical Implementation

| Feature | Location |
|---------|----------|
| Dynamic metadata | `lib/seo/metadata.ts` → `buildMetadata()` |
| Organization schema | `lib/seo/schema.ts` |
| Local business schema | `lib/seo/schema.ts` |
| Review schema | `lib/seo/schema.ts` — only when verified reviews exist |
| Breadcrumb schema | `lib/seo/schema.ts` |
| Blog schema | `lib/seo/schema.ts` |
| Case study schema | `lib/seo/schema.ts` |
| Service schema | `lib/seo/schema.ts` |
| Open Graph | Via `buildMetadata()` |
| Twitter Cards | Via `buildMetadata()` |
| XML sitemap | `app/sitemap.ts` |
| Robots.txt | `app/robots.ts` |
| Canonical URLs | `alternates.canonical` in metadata |
| Search Console | `GOOGLE_SITE_VERIFICATION` env var |

## Content SEO Architecture

### Insights (Blog)

- Category taxonomy aligned to priority keywords
- Per-article SEO group in Payload (title, description, keywords, OG image)
- BlogPosting schema on publish
- Internal linking to services and case studies

### Case Studies

- Full narrative structure: challenge → strategy → execution → results
- CaseStudy/Article schema
- Industry and client metadata for long-tail search
- Client operating geography (e.g. Southern Oregon) may remain as factual proof — not KXD market targeting

### Services

- One page per core offering
- Service schema on each
- Luxury websites receive highest sitemap priority (0.95)

## Reviews

- Public reviews only when verified (Google Business Profile or curated manual)
- Never invent testimonials, ratings, or review counts
- AggregateRating / Review schema only when verified reviews are present
- Google Business Profile sync prepared; until live, omit public review UI and review schema

## Analytics

- GA4 via `NEXT_PUBLIC_GA4_MEASUREMENT_ID`
- GTM via `NEXT_PUBLIC_GTM_ID` (preferred when both set)
- Event taxonomy in `lib/analytics/config.ts`

## Indexing Rules

**Allow:** All public marketing routes

**Disallow:** `/admin/`, `/api/`, `/portal/`, `/dashboard/`, `/ops/`, `/junior-creators/`, `/os/`, `/website-audit/results/`

## Next Steps

1. Populate Payload with case studies targeting hospitality, motorsports, contractor/service, and systems proof
2. Publish insights aligned to priority keywords
3. Submit sitemap to Google Search Console
4. Configure GA4 and GTM in production environment
5. Wire verified Google reviews before re-enabling review schema
