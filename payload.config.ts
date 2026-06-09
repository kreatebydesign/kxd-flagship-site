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

const databaseUri =
  process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim();

const isProductionRuntime =
  process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);

if (isProductionRuntime && !databaseUri) {
  throw new Error(
    "Payload production database connection missing. Set DATABASE_URI in Vercel.",
  );
}

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
          max: 1,
          connectionTimeoutMillis: 30_000,
          idleTimeoutMillis: 30_000,
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