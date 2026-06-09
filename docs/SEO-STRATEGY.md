# KXD SEO Strategy

## Objective

Establish Kreate by Design as an organic search leader for premium web design and platform development — with luxury websites as the primary keyword anchor.

## Priority Keywords

| Keyword | Target Page |
|---------|-------------|
| Luxury Website Design | `/`, `/services/luxury-websites` |
| Hospitality Website Design | `/work`, `/insights` |
| Motorsports Website Development | `/work`, `/insights` |
| Membership Platform Development | `/platforms`, `/services/operational-platforms` |
| Operational Platform Development | `/platforms` |
| Portland Web Design Agency | `/`, `/about` |
| Oregon Web Design Agency | `/`, `/about` |
| Enterprise Website Development | `/services/enterprise-systems` |

## Technical Implementation

| Feature | Location |
|---------|----------|
| Dynamic metadata | `lib/seo/metadata.ts` → `buildMetadata()` |
| Organization schema | `lib/seo/schema.ts` |
| Local business schema | `lib/seo/schema.ts` |
| Review schema | `lib/seo/schema.ts` (4.5+ only) |
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

### Services

- One page per core offering
- Service schema on each
- Luxury websites receive highest sitemap priority (0.95)

## Reviews

- Only reviews rated 4.5+ render publicly
- AggregateRating schema computed from published reviews
- Google Business Profile sync prepared but not exposed

## Analytics

- GA4 via `NEXT_PUBLIC_GA4_MEASUREMENT_ID`
- GTM via `NEXT_PUBLIC_GTM_ID` (preferred when both set)
- Event taxonomy in `lib/analytics/config.ts`

## Indexing Rules

**Allow:** All public marketing routes

**Disallow:** `/admin/`, `/api/`, `/portal/`, `/dashboard/`, `/ops/`

## Next Steps

1. Populate Payload with case studies targeting hospitality and motorsports
2. Publish insights aligned to priority keywords
3. Submit sitemap to Google Search Console
4. Configure GA4 and GTM in production environment
