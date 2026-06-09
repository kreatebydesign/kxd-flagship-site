import path from "path";
import { fileURLToPath } from "url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";
import { migrations } from "./migrations/index.ts";

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

// Prefer DATABASE_URI (direct Neon URL), fall back to DATABASE_URL (Neon/Vercel default).
// Both env vars should use the DIRECT (non-pooled) Neon connection string in Vercel.
// Avoid the pooled URL here — @payloadcms/db-postgres uses prepared statements which
// are not supported by Neon's PgBouncer in transaction mode.
const databaseUri =
  process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim();

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
          // Serverless-safe settings for Vercel + Neon direct connections:
          // max:1 — one connection per Lambda invocation, released on idle.
          // connectionTimeoutMillis:5000 — fail fast (Vercel default timeout is 10s).
          // idleTimeoutMillis:10000 — release idle connections quickly.
          // allowExitOnIdle — Node process can exit with idle pg connections.
          max: 1,
          connectionTimeoutMillis: 5_000,
          idleTimeoutMillis: 10_000,
          allowExitOnIdle: true,
        },
        migrationDir: path.resolve(dirname, "migrations"),
        prodMigrations: migrations,
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
