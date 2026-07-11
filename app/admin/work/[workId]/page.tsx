/**
 * /admin/work/[workId]
 * Phase 20D — Work detail
 */

import { notFound } from "next/navigation";
import { WorkDetailClient } from "@/components/admin/work/WorkDetailClient";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { getWorkItem } from "@/lib/work/services";

export const dynamic = "force-dynamic";

export default async function WorkDetailPage({
  params,
}: {
  params: Promise<{ workId: string }>;
}) {
  const user = await requirePayloadAdminPage("/admin/work");
  const { workId: raw } = await params;
  const workId = Number.parseInt(raw, 10);
  if (!Number.isFinite(workId)) notFound();

  const work = await getWorkItem(workId);
  if (!work) notFound();

  return (
    <WorkDetailClient
      initialWork={work}
      currentUser={{
        id: Number(user.id),
        email: typeof user.email === "string" ? user.email : "",
        displayName: typeof user.displayName === "string" ? user.displayName : null,
      }}
    />
  );
}
