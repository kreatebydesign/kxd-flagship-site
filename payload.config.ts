import path from "path";
import { fileURLToPath } from "url";
import { loadEnv } from "payload/node";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";

import { AutomationEvents } from "./payload/collections/AutomationEvents.ts";
import { AutomationNotifications } from "./payload/collections/AutomationNotifications.ts";
import { BrandKitAssets } from "./payload/collections/BrandKitAssets.ts";
import { BrandKits } from "./payload/collections/BrandKits.ts";
import { CaseStudies } from "./payload/collections/CaseStudies.ts";
import { ClientCommunications } from "./payload/collections/ClientCommunications.ts";
import { ClientActions } from "./payload/collections/ClientActions.ts";
import { ClientInfrastructure } from "./payload/collections/ClientInfrastructure.ts";
import { ClientOnboarding } from "./payload/collections/ClientOnboarding.ts";
import { ClientTimelineEvents } from "./payload/collections/ClientTimelineEvents.ts";
import { ClientProjects } from "./payload/collections/ClientProjects.ts";
import { ClientRequests } from "./payload/collections/ClientRequests.ts";
import { ClientTasks } from "./payload/collections/ClientTasks.ts";
import { ProposalActivity } from "./payload/collections/ProposalActivity.ts";
import { ProposalApprovals } from "./payload/collections/ProposalApprovals.ts";
import { EstimateItems } from "./payload/collections/EstimateItems.ts";
import { ProposalTemplates } from "./payload/collections/ProposalTemplates.ts";
import { GenesisSessions } from "./payload/collections/GenesisSessions.ts";
import { WebsiteQAChecks } from "./payload/collections/WebsiteQAChecks.ts";
import { Clients } from "./payload/collections/Clients.ts";
import { ExecutiveClientProfiles } from "./payload/collections/ExecutiveClientProfiles.ts";
import { ExecutiveNotes } from "./payload/collections/ExecutiveNotes.ts";
import { BrainMemory } from "./payload/collections/BrainMemory.ts";
import { ExecutiveTimelineEvents } from "./payload/collections/ExecutiveTimelineEvents.ts";
import { InfrastructureCosts } from "./payload/collections/InfrastructureCosts.ts";
import { InfrastructureEvents } from "./payload/collections/InfrastructureEvents.ts";
import { CreativeAssets } from "./payload/collections/CreativeAssets.ts";
import { CreativeCampaigns } from "./payload/collections/CreativeCampaigns.ts";
import { FlyerRequests } from "./payload/collections/FlyerRequests.ts";
import { JuniorCreatorUsers } from "./payload/collections/JuniorCreatorUsers.ts";
import { JuniorCreatorShifts } from "./payload/collections/JuniorCreatorShifts.ts";
import { Inquiries } from "./payload/collections/Inquiries.ts";
import { Insights } from "./payload/collections/Insights.ts";
import { Media } from "./payload/collections/Media.ts";
import { MonthlyReports } from "./payload/collections/MonthlyReports.ts";
import { MonthlyDeliverables } from "./payload/collections/MonthlyDeliverables.ts";
import { Playbooks } from "./payload/collections/Playbooks.ts";
import { PlaybookSteps } from "./payload/collections/PlaybookSteps.ts";
import { PlaybookRuns } from "./payload/collections/PlaybookRuns.ts";
import { ClientSuccessPlans } from "./payload/collections/ClientSuccessPlans.ts";
import { SuccessCheckIns } from "./payload/collections/SuccessCheckIns.ts";
import { Partners } from "./payload/collections/Partners.ts";
import { PortalUsers } from "./payload/collections/PortalUsers.ts";
import { PlatformApplications } from "./payload/collections/PlatformApplications.ts";
import { ProjectInquiries } from "./payload/collections/ProjectInquiries.ts";
import { Projects } from "./payload/collections/Projects.ts";
import { PromoVideoRequests } from "./payload/collections/PromoVideoRequests.ts";
import { ProposalAgreements } from "./payload/collections/ProposalAgreements.ts";
import { ProposalSections } from "./payload/collections/ProposalSections.ts";
import { ProposalViewEvents } from "./payload/collections/ProposalViewEvents.ts";
import { Proposals } from "./payload/collections/Proposals.ts";
import { ReportTemplates } from "./payload/collections/ReportTemplates.ts";
import { ResearchLeads } from "./payload/collections/ResearchLeads.ts";
import { Retainers } from "./payload/collections/Retainers.ts";
import { SalesActivities } from "./payload/collections/SalesActivities.ts";
import { SalesLeads } from "./payload/collections/SalesLeads.ts";
import { Reviews } from "./payload/collections/Reviews.ts";
import { Services } from "./payload/collections/Services.ts";
import { SocialPostRequests } from "./payload/collections/SocialPostRequests.ts";
import { TeamMembers } from "./payload/collections/TeamMembers.ts";
import { Testimonials } from "./payload/collections/Testimonials.ts";
import { Users } from "./payload/collections/Users.ts";
import { WebsiteAudits } from "./payload/collections/WebsiteAudits.ts";
import { WebsiteAuditAttempts } from "./payload/collections/WebsiteAuditAttempts.ts";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// Match Payload CLI / migrate: load .env.local before reading DATABASE_URI.
loadEnv(dirname);

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
    components: {
      graphics: {
        Logo: "./components/admin/PayloadLogo.tsx#PayloadLogo",
        Icon: "./components/admin/PayloadIcon.tsx#PayloadIcon",
      },
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
    WebsiteAuditAttempts,
    ResearchLeads,
    // ── KXD OS ───────────────────────────────────────────────────────────────
    Clients,
    ExecutiveClientProfiles,
    ExecutiveNotes,
    BrainMemory,
    Retainers,
    ClientProjects,
    MonthlyDeliverables,
    ClientRequests,
    ClientCommunications,
    ClientActions,
    ClientTasks,
    GenesisSessions,
    WebsiteQAChecks,
    ClientOnboarding,
    ClientTimelineEvents,
    ExecutiveTimelineEvents,
    AutomationEvents,
    AutomationNotifications,
    Playbooks,
    PlaybookSteps,
    PlaybookRuns,
    ClientSuccessPlans,
    SuccessCheckIns,
    SalesLeads,
    Proposals,
    ProposalTemplates,
    ProposalSections,
    EstimateItems,
    ProposalApprovals,
    ProposalActivity,
    ProposalAgreements,
    ProposalViewEvents,
    SalesActivities,
    MonthlyReports,
    ReportTemplates,
    ClientInfrastructure,
    InfrastructureEvents,
    InfrastructureCosts,
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
    JuniorCreatorUsers,
    JuniorCreatorShifts,
  ],
  editor: lexicalEditor(),
  i18n: {
    translations: {
      en: {
        authentication: {
          login: "Enter KXD OS",
        },
      },
    },
  },
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
