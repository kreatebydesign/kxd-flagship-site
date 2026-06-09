import path from "path";
import { fileURLToPath } from "url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";

import { CaseStudies } from "./payload/collections/CaseStudies.ts";
import { Inquiries } from "./payload/collections/Inquiries.ts";
import { Insights } from "./payload/collections/Insights.ts";
import { Media } from "./payload/collections/Media.ts";
import { Partners } from "./payload/collections/Partners.ts";
import { PlatformApplications } from "./payload/collections/PlatformApplications.ts";
import { Projects } from "./payload/collections/Projects.ts";
import { Reviews } from "./payload/collections/Reviews.ts";
import { Services } from "./payload/collections/Services.ts";
import { TeamMembers } from "./payload/collections/TeamMembers.ts";
import { Testimonials } from "./payload/collections/Testimonials.ts";
import { Users } from "./payload/collections/Users.ts";

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
    Projects,
    CaseStudies,
    Services,
    Testimonials,
    Reviews,
    Partners,
    TeamMembers,
    Insights,
    Inquiries,
    PlatformApplications,
    Media,
    Users,
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
