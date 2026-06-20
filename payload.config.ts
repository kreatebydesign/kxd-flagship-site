import path from "path";
import { fileURLToPath } from "url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";

import { BrandKitAssets } from "./payload/collections/BrandKitAssets.ts";
import { BrandKits } from "./payload/collections/BrandKits.ts";
import { CaseStudies } from "./payload/collections/CaseStudies.ts";
import { ClientOnboarding } from "./payload/collections/ClientOnboarding.ts";
import { ClientProjects } from "./payload/collections/ClientProjects.ts";
import { ClientRequests } from "./payload/collections/ClientRequests.ts";
import { Clients } from "./payload/collections/Clients.ts";
import { CreativeAssets } from "./payload/collections/CreativeAssets.ts";
import { CreativeCampaigns } from "./payload/collections/CreativeCampaigns.ts";
import { FlyerRequests } from "./payload/collections/FlyerRequests.ts";
import { Inquiries } from "./payload/collections/Inquiries.ts";
import { Insights } from "./payload/collections/Insights.ts";
import { Media } from "./payload/collections/Media.ts";
import { MonthlyDeliverables } from "./payload/collections/MonthlyDeliverables.ts";
import { Partners } from "./payload/collections/Partners.ts";
import { PortalUsers } from "./payload/collections/PortalUsers.ts";
import { PlatformApplications } from "./payload/collections/PlatformApplications.ts";
import { ProjectInquiries } from "./payload/collections/ProjectInquiries.ts";
import { Projects } from "./payload/collections/Projects.ts";
import { PromoVideoRequests } from "./payload/collections/PromoVideoRequests.ts";
import { Retainers } from "./payload/collections/Retainers.ts";
import { Reviews } from "./payload/collections/Reviews.ts";
import { Services } from "./payload/collections/Services.ts";
import { SocialPostRequests } from "./payload/collections/SocialPostRequests.ts";
import { TeamMembers } from "./payload/collections/TeamMembers.ts";
import { Testimonials } from "./payload/collections/Testimonials.ts";
import { Users } from "./payload/collections/Users.ts";
import { WebsiteAudits } from "./payload/collections/WebsiteAudits.ts";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// Prefer DATABASE_URI, fall back to DATABASE_URL.
// In Vercel, DATABASE_URI must be the Neon direct (non-pooled) URL.
// SQLite fallback is only reachable in local dev where both vars are absent.
const databaseUri =
  process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim();

// Diagnostic — host only, no credentials.
let dbHost = "(none — SQLite fallback)";
if (databaseUri) {
  try {
    dbHost = new URL(databaseUri).hostname;
  } catch {
    dbHost = "(unparseable)";
  }
}
console.log("[KXD] Payload DB config loaded", {
  host: dbHost,
  NODE_ENV: process.env.NODE_ENV,
  VERCEL: Boolean(process.env.VERCEL),
});

export default buildConfig({
  admin: {
    user: Users.slug,
    theme: "dark",
    meta: {
      title: "KXD",
      titleSuffix: " · Kreate by Design",
      description: "Content management for Kreate by Design.",
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    // ── Portfolio & Content ──────────────────────────────────────────────────
    Projects,
    CaseStudies,
    Services,
    Testimonials,
    Reviews,
    Partners,
    TeamMembers,
    Insights,
    // ── Leads & Applications ─────────────────────────────────────────────────
    Inquiries,
    ProjectInquiries,
    PlatformApplications,
    WebsiteAudits,
    // ── KXD OS ───────────────────────────────────────────────────────────────
    Clients,
    Retainers,
    ClientProjects,
    MonthlyDeliverables,
    ClientRequests,
    ClientOnboarding,
    // ── Creative Engine ──────────────────────────────────────────────────────
    CreativeCampaigns,
    BrandKits,
    BrandKitAssets,
    FlyerRequests,
    PromoVideoRequests,
    SocialPostRequests,
    CreativeAssets,
    // ── System ───────────────────────────────────────────────────────────────
    Media,
    Users,
    PortalUsers,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "kxd-dev-secret-change-in-production",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: databaseUri
    ? postgresAdapter({
        pool: {
          connectionString: databaseUri,
        },
        // push: false prevents Drizzle's dev-mode schema-push from running.
        // Drizzle push generates invalid DDL against Neon Postgres:
        //   ALTER TABLE "creative_campaigns_platforms" ALTER COLUMN "id" SET DATA TYPE serial
        // `serial` is a CREATE-time pseudo-type — not valid in ALTER COLUMN SET DATA TYPE.
        // All schema changes go through explicit migrations (npm run migrate).
        push: false,
        // migrationDir kept for CLI use (npm run migrate).
        // prodMigrations intentionally removed — all migrations have been
        // applied manually and are confirmed in the payload_migrations table.
        // Running prodMigrations on every cold start was causing Vercel Lambda
        // init to hang while Payload acquired a DB lock and traversed migrations.
        migrationDir: path.resolve(dirname, "migrations"),
      })
    : sqliteAdapter({
        client: {
          url: process.env.PAYLOAD_SQLITE_PATH || "file:./.payload/kxd.sqlite",
        },
        push: true,
      }),
  sharp,
  plugins: [],
});
