/**
 * /admin/operations/growth
 * KXD OS — Growth Intelligence
 */

import { getPayload } from "payload";
import config from "@payload-config";
import { GrowthScreen } from "@/components/admin/operations/growth/GrowthScreen";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export default async function GrowthPage() {
  const now      = new Date();
  const todayISO = now.toISOString();

  const dateDisplay = now.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const timeDisplay = now.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
  });

  // ── Parallel Payload queries ─────────────────────────────────────────────

  let inquiries:       AnyDoc[] = [];
  let projInquiries:   AnyDoc[] = [];
  let activeRetainers: AnyDoc[] = [];
  let overdueFollowUps: AnyDoc[] = [];

  try {
    const payload = await getPayload({ config });

    const [
      inquiriesR,
      projInquiriesR,
      retainersR,
      followUpsR,
    ] = await Promise.allSettled([

      // 1. Contact form leads — all non-archived/spam
      payload.find({
        collection: "inquiries",
        depth: 0, limit: 200,
        where: { status: { not_in: ["archived", "spam"] } },
        sort: "-createdAt",
      }),

      // 2. Start-project intake — all non-closed/completed
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "project-inquiries" as any,
        depth: 0, limit: 100,
        where: { status: { not_in: ["closed", "completed"] } },
        sort: "-createdAt",
      }),

      // 3. Active retainers — MRR base
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "retainers" as any,
        depth: 0, limit: 50,
        where: { billingStatus: { in: ["active", "current"] } },
      }),

      // 4. Overdue follow-ups — Inquiries with past followUpDate
      payload.find({
        collection: "inquiries",
        depth: 0, limit: 30,
        where: {
          and: [
            { followUpDate: { less_than_equal: todayISO } },
            { status: { not_in: ["won", "lost", "archived", "spam"] } },
          ],
        },
        sort: "followUpDate",
      }),
    ]);

    if (inquiriesR.status     === "fulfilled") inquiries         = inquiriesR.value.docs     as AnyDoc[];
    if (projInquiriesR.status === "fulfilled") projInquiries     = projInquiriesR.value.docs as AnyDoc[];
    if (retainersR.status     === "fulfilled") activeRetainers   = retainersR.value.docs     as AnyDoc[];
    if (followUpsR.status     === "fulfilled") overdueFollowUps  = followUpsR.value.docs     as AnyDoc[];

  } catch {
    // Payload unavailable — all sections degrade to their empty states
  }

  return (
    <GrowthScreen
      dateDisplay={dateDisplay}
      timeDisplay={timeDisplay}
      inquiries={inquiries}
      projInquiries={projInquiries}
      overdueFollowUps={overdueFollowUps}
      activeRetainers={activeRetainers}
    />
  );
}
