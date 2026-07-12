import { registerIntegrationProvider } from "./registry";
import { buildSettingsSchema } from "./settings";
import type { IntegrationProviderDefinition } from "./types";

const PROVIDER_DEFINITIONS: IntegrationProviderDefinition[] = [
  {
    id: "github",
    name: "GitHub",
    category: "developer",
    icon: "GH",
    description: "Repository activity, deployments, and project signals for delivery intelligence.",
    supportedFeatures: ["Repository linking", "Commit activity", "Pull request signals", "Deployment hooks"],
    futureCapabilities: ["PR automation", "Release tracking", "Issue sync", "Branch protection status"],
    consumers: ["Projects", "Command Center", "Timeline", "Brain"],
    connectPriority: 3,
    settingsSchema: buildSettingsSchema({
      documentationUrl: "https://docs.github.com/en/rest",
      apiKeys: [
        { key: "personal_access_token", label: "Personal Access Token", type: "api_key", placeholder: "ghp_…", required: true, envVar: "GITHUB_TOKEN" },
      ],
      oauth: { label: "GitHub OAuth App", scopes: ["repo", "read:org"], placeholder: "OAuth app credentials — future" },
      webhooks: [{ key: "push_webhook", label: "Repository Webhook", placeholder: "https://kxd.app/api/integrations/github/webhook" }],
      envVars: [{ key: "GITHUB_TOKEN", label: "GitHub Token", required: false }],
      permissions: ["Read repositories", "Read pull requests", "Read deployments"],
      scopes: ["repo", "read:org"],
    }),
  },
  {
    id: "vercel",
    name: "Vercel",
    category: "infrastructure",
    icon: "VC",
    description: "Deployment platform status, build health, and infrastructure signals.",
    supportedFeatures: ["Deployment status", "Build logs reference", "Domain routing", "Preview URLs"],
    futureCapabilities: ["Auto rollback alerts", "Edge config sync", "Analytics bridge"],
    consumers: ["Infrastructure", "Command Center", "Brain"],
    connectPriority: 4,
    settingsSchema: buildSettingsSchema({
      documentationUrl: "https://vercel.com/docs/rest-api",
      apiKeys: [
        { key: "api_token", label: "API Token", type: "api_key", placeholder: "vercel_…", envVar: "VERCEL_TOKEN" },
      ],
      webhooks: [{ key: "deployment_webhook", label: "Deployment Webhook", placeholder: "https://kxd.app/api/integrations/vercel/webhook", events: ["deployment.created", "deployment.succeeded"] }],
      envVars: [
        { key: "VERCEL", label: "Vercel Runtime", required: false, description: "Set automatically on Vercel" },
        { key: "VERCEL_TOKEN", label: "Vercel API Token", required: false },
      ],
      permissions: ["Read deployments", "Read projects", "Read domains"],
    }),
  },
  {
    id: "google-analytics-4",
    name: "Google Analytics 4",
    category: "analytics",
    icon: "GA",
    description: "Website traffic, conversion events, and audience signals for reporting and Brain.",
    supportedFeatures: ["Event tracking", "Audience overview", "Conversion paths", "Custom dimensions"],
    futureCapabilities: ["Automated monthly metrics", "Anomaly detection", "Client-level views"],
    consumers: ["Reporting", "Client HQ", "Brain", "Founder Intelligence"],
    connectPriority: 5,
    settingsSchema: buildSettingsSchema({
      documentationUrl: "https://developers.google.com/analytics/devguides/collection/ga4",
      oauth: { label: "Google OAuth", scopes: ["https://www.googleapis.com/auth/analytics.readonly"], placeholder: "Service account or OAuth — future" },
      envVars: [
        { key: "NEXT_PUBLIC_GA4_MEASUREMENT_ID", label: "GA4 Measurement ID", required: false },
        { key: "GA4_PROPERTY_ID", label: "GA4 Property ID", required: false },
      ],
      permissions: ["Read analytics data", "Read property configuration"],
      scopes: ["analytics.readonly"],
    }),
  },
  {
    id: "google-search-console",
    name: "Google Search Console",
    category: "analytics",
    icon: "SC",
    description: "Search performance, indexing health, and SEO opportunity signals.",
    supportedFeatures: ["Search queries", "Index coverage", "Core Web Vitals reference", "Sitemap status"],
    futureCapabilities: ["Weekly SEO digest", "Index issue alerts", "Keyword opportunity ranking"],
    consumers: ["Website Health", "Reporting", "Brain"],
    connectPriority: 6,
    settingsSchema: buildSettingsSchema({
      documentationUrl: "https://developers.google.com/webmaster-tools/v1/api_reference_index",
      oauth: { label: "Google OAuth", scopes: ["https://www.googleapis.com/auth/webmasters.readonly"], placeholder: "OAuth credentials — future" },
      envVars: [
        { key: "GOOGLE_SITE_VERIFICATION", label: "Site Verification Meta", required: false },
        { key: "GSC_SITE_URL", label: "Search Console Site URL", required: false },
      ],
      permissions: ["Read search analytics", "Read index status"],
      scopes: ["webmasters.readonly"],
    }),
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "commerce",
    icon: "ST",
    description: "Payments, subscriptions, and revenue events for Sales and reporting.",
    supportedFeatures: ["Payment events", "Subscription status", "Invoice references", "Webhook ingestion"],
    futureCapabilities: ["MRR sync", "Churn alerts", "Revenue forecasting feed"],
    consumers: ["Sales", "Revenue", "Reporting", "Client HQ", "Founder Intelligence"],
    connectPriority: 2,
    coreStack: true,
    settingsSchema: buildSettingsSchema({
      documentationUrl: "https://stripe.com/docs/api",
      apiKeys: [
        { key: "secret_key", label: "Secret Key", type: "api_key", placeholder: "sk_live_…", required: true, envVar: "STRIPE_SECRET_KEY" },
      ],
      webhooks: [{ key: "payment_webhook", label: "Stripe Webhook", placeholder: "https://kxd.app/api/stripe/webhook", events: ["payment_intent.succeeded", "customer.subscription.updated"] }],
      envVars: [
        { key: "STRIPE_SECRET_KEY", label: "Stripe Secret Key", required: false },
        { key: "STRIPE_WEBHOOK_SECRET", label: "Webhook Secret", required: false },
      ],
      permissions: ["Read payments", "Read subscriptions", "Read customers"],
    }),
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    category: "infrastructure",
    icon: "CF",
    description: "DNS, CDN, security, and edge performance for infrastructure monitoring.",
    supportedFeatures: ["DNS records", "SSL status", "Cache analytics", "Security events"],
    futureCapabilities: ["WAF alert stream", "Uptime checks", "Page rule automation"],
    consumers: ["Infrastructure", "Website Health", "Brain"],
    connectPriority: 7,
    settingsSchema: buildSettingsSchema({
      documentationUrl: "https://developers.cloudflare.com/api/",
      apiKeys: [
        { key: "api_token", label: "API Token", type: "api_key", placeholder: "Cloudflare API token", envVar: "CLOUDFLARE_API_TOKEN" },
      ],
      envVars: [
        { key: "CLOUDFLARE_API_TOKEN", label: "API Token", required: false },
        { key: "CLOUDFLARE_ZONE_ID", label: "Zone ID", required: false },
      ],
      permissions: ["Read DNS", "Read SSL", "Read analytics"],
    }),
  },
  {
    id: "google-business-profile",
    name: "Google Business Profile",
    category: "analytics",
    icon: "GB",
    description: "Local presence, reviews, and listing health for client relationship signals.",
    supportedFeatures: ["Review sync", "Listing status", "Local insights", "Place metadata"],
    futureCapabilities: ["Review response queue", "Competitor benchmarks"],
    consumers: ["Client HQ", "Founder Intelligence", "Brain"],
    connectPriority: 8,
    settingsSchema: buildSettingsSchema({
      documentationUrl: "https://developers.google.com/my-business/reference/rest",
      oauth: { label: "Google OAuth", scopes: ["https://www.googleapis.com/auth/business.manage"], placeholder: "OAuth — future" },
      envVars: [
        { key: "GOOGLE_PLACES_API_KEY", label: "Places API Key", required: false },
        { key: "GOOGLE_PLACE_ID", label: "Place ID", required: false },
      ],
      permissions: ["Read reviews", "Read business profile"],
      scopes: ["business.manage"],
    }),
  },
  {
    id: "google-workspace",
    name: "Google Workspace",
    category: "communication",
    icon: "GW",
    description: "Calendar, email, and directory signals for executive workflow.",
    supportedFeatures: ["Calendar events", "Directory lookup", "Meeting references"],
    futureCapabilities: ["Meeting prep sync", "Shared drive links", "Contact enrichment"],
    consumers: ["Timeline", "Command Center", "Brain"],
    connectPriority: 9,
    settingsSchema: buildSettingsSchema({
      documentationUrl: "https://developers.google.com/workspace",
      oauth: {
        label: "Google Calendar OAuth (founder calendar)",
        scopes: [
          "https://www.googleapis.com/auth/calendar.readonly",
          "https://www.googleapis.com/auth/calendar.events",
        ],
        placeholder: "Phase 26C — user OAuth refresh token (readonly + events)",
      },
      envVars: [
        { key: "GOOGLE_WORKSPACE_DOMAIN", label: "Workspace Domain", required: false },
        { key: "GOOGLE_CALENDAR_CLIENT_ID", label: "Calendar OAuth Client ID", required: false },
        { key: "GOOGLE_CALENDAR_CLIENT_SECRET", label: "Calendar OAuth Client Secret", required: false },
        { key: "GOOGLE_CALENDAR_REDIRECT_URI", label: "Calendar OAuth Redirect URI", required: false },
        { key: "GOOGLE_CALENDAR_REFRESH_TOKEN", label: "Calendar OAuth Refresh Token", required: false },
        { key: "GOOGLE_CALENDAR_ID", label: "Preferred Calendar ID", required: false },
      ],
      permissions: [
        "Read calendar",
        "Read free/busy",
        "Create events",
        "Read linked events",
      ],
      scopes: ["calendar.readonly", "calendar.events"],
    }),
  },
  {
    id: "microsoft-365",
    name: "Microsoft 365",
    category: "communication",
    icon: "M365",
    description: "Outlook, Teams, and directory integration for enterprise clients.",
    supportedFeatures: ["Calendar sync", "Contact directory", "Teams meeting refs"],
    futureCapabilities: ["Teams notification bridge", "SharePoint asset links"],
    consumers: ["Timeline", "Command Center", "Brain"],
    connectPriority: 10,
    settingsSchema: buildSettingsSchema({
      documentationUrl: "https://learn.microsoft.com/en-us/graph/",
      oauth: { label: "Microsoft Graph OAuth", scopes: ["Calendars.Read", "User.Read"], placeholder: "Azure AD app — future" },
      envVars: [
        { key: "MICROSOFT_CLIENT_ID", label: "Client ID", required: false },
        { key: "MICROSOFT_TENANT_ID", label: "Tenant ID", required: false },
      ],
      permissions: ["Read calendar", "Read user profile"],
      scopes: ["Calendars.Read", "User.Read"],
    }),
  },
  {
    id: "resend",
    name: "Resend",
    category: "communication",
    icon: "RS",
    description: "Transactional email delivery for inquiries, portal, and client communications.",
    supportedFeatures: ["Transactional email", "Delivery status", "Template references"],
    futureCapabilities: ["Bounce tracking", "Campaign analytics", "Inbox event stream"],
    consumers: ["Sales", "Portal", "Automation", "Notifications"],
    connectPriority: 11,
    coreStack: true,
    settingsSchema: buildSettingsSchema({
      documentationUrl: "https://resend.com/docs/api-reference/introduction",
      apiKeys: [
        { key: "api_key", label: "API Key", type: "api_key", placeholder: "re_…", envVar: "RESEND_API_KEY" },
      ],
      envVars: [
        { key: "RESEND_API_KEY", label: "Resend API Key", required: false },
        { key: "RESEND_FROM_EMAIL", label: "From Email", required: false },
      ],
      permissions: ["Send email", "Read delivery status"],
    }),
  },
  {
    id: "payload",
    name: "Payload",
    category: "platform",
    icon: "PX",
    description: "KXD Core data layer — CMS, collections, and operational records.",
    supportedFeatures: ["Collections API", "Admin auth", "Hooks", "Access control"],
    futureCapabilities: ["Cross-collection sync jobs", "Webhook fan-out", "Audit log stream"],
    consumers: ["Command Center", "Brain", "Automation", "Reporting", "Sales", "Infrastructure"],
    connectPriority: 0,
    coreStack: true,
    settingsSchema: buildSettingsSchema({
      documentationUrl: "https://payloadcms.com/docs",
      envVars: [
        { key: "PAYLOAD_SECRET", label: "Payload Secret", required: true },
        { key: "DATABASE_URI", label: "Database URI", required: false },
      ],
      permissions: ["Read collections", "Write collections", "Admin access"],
    }),
  },
  {
    id: "neon-postgresql",
    name: "Neon PostgreSQL",
    category: "database",
    icon: "DB",
    description: "Primary Postgres database for Payload and KXD operational data.",
    supportedFeatures: ["Connection pooling", "Branching reference", "Backup status placeholder"],
    futureCapabilities: ["Query performance insights", "Branch previews", "Failover monitoring"],
    consumers: ["Infrastructure", "Command Center", "Automation"],
    connectPriority: 1,
    coreStack: true,
    settingsSchema: buildSettingsSchema({
      documentationUrl: "https://neon.tech/docs/introduction",
      envVars: [
        { key: "DATABASE_URI", label: "Database URI", required: false },
        { key: "DATABASE_URL", label: "Database URL", required: false },
      ],
      permissions: ["Read database metadata", "Connection health check"],
    }),
  },
];

let registered = false;

export function ensureIntegrationProvidersRegistered(): void {
  if (registered) return;
  for (const def of PROVIDER_DEFINITIONS) {
    registerIntegrationProvider(def);
  }
  registered = true;
}

export function getProviderDefinitions(): IntegrationProviderDefinition[] {
  ensureIntegrationProvidersRegistered();
  return PROVIDER_DEFINITIONS;
}
