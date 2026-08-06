import { notFound } from "next/navigation";
import Link from "next/link";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { KxdPage, KxdSection } from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { DirectAgreementCreateForm } from "@/components/admin/sales/DirectAgreementCreateForm";
import { getPayload } from "payload";
import config from "@payload-config";

export const dynamic = "force-dynamic";

export default async function CreateDirectAgreementPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const clientId = Number((await params).clientId);
  if (!clientId) notFound();

  const payload = await getPayload({ config });
  let client: { id: number; name?: string } | null = null;
  try {
    client = (await payload.findByID({
      collection: "clients" as never,
      id: clientId,
      depth: 0,
      overrideAccess: true,
    })) as { id: number; name?: string };
  } catch {
    notFound();
  }

  return (
    <OperationsShell activeId="clients">
      <KxdPage>
        <OperationsPageHero
          eyebrow="Direct Agreement"
          title={`Create Direct Agreement — ${client.name ?? `Client ${clientId}`}`}
          lead="First-class commercial engagement without a proposal. Converges into the existing contract lifecycle, documents, and client Commercial area."
        />
        <KxdSection>
          <div style={{ marginBottom: "1rem" }}>
            <Link
              href={`/admin/operations/client-command/${clientId}?tab=contracts`}
              className="kxd-os-link-quiet"
            >
              ← Back to contracts
            </Link>
          </div>
          <DirectAgreementCreateForm
            clientId={clientId}
            clientName={String(client.name ?? `Client ${clientId}`)}
          />
        </KxdSection>
      </KxdPage>
    </OperationsShell>
  );
}
