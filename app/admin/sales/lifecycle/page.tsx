import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { KxdPage, KxdSection } from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { contractStatusLabel, proposalStatusLabel } from "@/lib/proposal-lifecycle/progression";
import { normalizeLifecyclePackage } from "@/lib/proposal-lifecycle/package";

export const dynamic = "force-dynamic";

/**
 * Operator queue for accepted proposals, contracts in review, and billing blockers.
 * Does not auto-send, charge, onboard, or mutate Stripe live objects.
 */
export default async function LifecycleQueuePage() {
  const payload = await getPayload({ config });

  const [accepted, contracts] = await Promise.all([
    payload.find({
      collection: "proposals" as never,
      where: { status: { equals: "accepted-contract-pending" } },
      limit: 40,
      sort: "-acceptedAt",
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: "contracts" as never,
      where: {
        status: {
          in: [
            "draft",
            "internal-review",
            "approved-for-signature",
            "partially-signed",
            "sent-for-signature",
            "executed",
          ],
        },
      },
      limit: 60,
      sort: "-updatedAt",
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  const billingBlocked = (contracts.docs as Array<Record<string, unknown>>).filter((c) => {
    const pkg = normalizeLifecyclePackage(c.lifecyclePackage);
    return (pkg.billingReadinessIssues ?? []).some((i) => i.severity === "blocker");
  });

  return (
    <OperationsShell activeId="sales-proposals">
      <KxdPage>
        <OperationsPageHero
          eyebrow="Sales lifecycle"
          title="Proposal → Contract → Billing queues"
          lead="Accepted proposals, contracts awaiting review or signature, and billing readiness blockers. All financial and onboarding actions remain operator-controlled."
        />
        <KxdSection>
          <Queue
            title="Accepted — contract required"
            empty="No accepted proposals awaiting contract review."
            items={(accepted.docs as Array<Record<string, unknown>>).map((p) => ({
              id: String(p.id),
              title: String(p.title ?? "Proposal"),
              meta: `${String(p.proposalNumber ?? "")} · ${proposalStatusLabel(String(p.status))}`,
              href: p.relatedContract
                ? `/admin/sales/contracts/${typeof p.relatedContract === "object" ? (p.relatedContract as { id: number }).id : p.relatedContract}`
                : `/admin/sales/proposals/${p.id}`,
            }))}
          />
          <Queue
            title="Contracts in flight"
            empty="No contracts in active lifecycle states."
            items={(contracts.docs as Array<Record<string, unknown>>).map((c) => ({
              id: String(c.id),
              title: String(c.title ?? "Agreement"),
              meta: contractStatusLabel(String(c.status)),
              href: `/admin/sales/contracts/${c.id}`,
            }))}
          />
          <Queue
            title="Billing readiness blockers"
            empty="No contracts currently blocked on billing readiness."
            items={billingBlocked.map((c) => {
              const pkg = normalizeLifecyclePackage(c.lifecyclePackage);
              const codes = (pkg.billingReadinessIssues ?? [])
                .filter((i) => i.severity === "blocker")
                .map((i) => i.code)
                .slice(0, 4)
                .join(", ");
              return {
                id: String(c.id),
                title: String(c.title ?? "Agreement"),
                meta: codes || "Blocked",
                href: `/admin/sales/contracts/${c.id}`,
              };
            })}
          />
          <p style={{ marginTop: "1.5rem", opacity: 0.75, fontSize: 14 }}>
            Proposal ID 1 (Sutherlin Throwdown partnership) remains a protected draft and is excluded
            from simulated send paths.
          </p>
        </KxdSection>
      </KxdPage>
    </OperationsShell>
  );
}

function Queue({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ id: string; title: string; meta: string; href: string }>;
}) {
  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2 style={{ fontSize: "1.05rem", marginBottom: "0.75rem" }}>{title}</h2>
      {items.length === 0 ? (
        <p style={{ opacity: 0.7 }}>{empty}</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {items.map((item) => (
            <li
              key={`${title}-${item.id}`}
              style={{
                borderTop: "1px solid rgba(255,255,255,0.08)",
                padding: "0.75rem 0",
              }}
            >
              <Link href={item.href} className="kxd-os-link-quiet">
                {item.title}
              </Link>
              <div style={{ fontSize: 13, opacity: 0.7, marginTop: 2 }}>{item.meta}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
