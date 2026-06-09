import path from "path";
import { fileURLToPath } from "url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";

import { CaseStudies } from "./payload/collections/CaseStudies";
import { Inquiries } from "./payload/collections/Inquiries";
import { Insights } from "./payload/collections/Insights";
import { Media } from "./payload/collections/Media";
import { Partners } from "./payload/collections/Partners";
import { PlatformApplications } from "./payload/collections/PlatformApplications";
import { Projects } from "./payload/collections/Projects";
import { Reviews } from "./payload/collections/Reviews";
import { Services } from "./payload/collections/Services";
import { TeamMembers } from "./payload/collections/TeamMembers";
import { Testimonials } from "./payload/collections/Testimonials";
import { Users } from "./payload/collections/Users";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const databaseUri = process.env.DATABASE_URI?.trim();

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
