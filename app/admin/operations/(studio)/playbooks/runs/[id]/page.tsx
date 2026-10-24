import { notFound } from "next/navigation";
import { PlaybookRunScreen } from "@/components/admin/operations/playbooks/PlaybookRunScreen";
import { getPlaybookRunDetail } from "@/lib/playbooks";

export const dynamic = "force-dynamic";

export default async function PlaybookRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = await getPlaybookRunDetail(Number(id));
  if (!run) notFound();
  return <PlaybookRunScreen run={run} />;
}
