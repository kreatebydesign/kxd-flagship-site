import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import { KxdLogo } from "@/components/ui/KxdLogo";
import { getJuniorCreatorSession } from "@/lib/junior-creators/session";
import { RESEARCH_SERVICE_LABEL, RESEARCH_STATUS_LABEL } from "@/lib/research-leads";

export const dynamic = "force-dynamic";

import { KXD_OS as C } from "@/lib/kxd-os/palette";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return "—"; }
}

export default async function JuniorCreatorsLeadsPage() {
  const session = await getJuniorCreatorSession();
  if (!session) {
    redirect("/junior-creators/login");
  }

  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "research-leads" as any,
    where: { juniorCreatorUser: { equals: session.juniorCreatorUserId } },
    limit: 200,
    depth: 0,
    sort: "-createdAt",
    overrideAccess: true,
  });

  const leads = result.docs as AnyDoc[];

  return (
    <div style={{ background: C.bgBase, minHeight: "100vh", color: C.cream, fontFamily: C.sans }}>
      <header style={{ background: C.bgPure, borderBottom: `1px solid ${C.borderGold}` }}>
        <div className="mx-auto flex max-w-screen-lg items-center justify-between gap-4" style={{ padding: "1.125rem 1.5rem" }}>
          <KxdLogo />
          <Link href="/junior-creators" style={{ fontFamily: C.sans, fontSize: "0.6875rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.goldDim, textDecoration: "none" }}>
            ← Dashboard
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-screen-lg" style={{ padding: "2.5rem 1.5rem 4rem" }}>
        <h1 style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "2rem", marginBottom: "1.5rem" }}>My Research Leads</h1>
        {leads.length === 0 ? (
          <p style={{ fontSize: "0.8125rem", color: C.creamSubtle }}>No leads submitted yet.</p>
        ) : (
          <div style={{ border: `1px solid ${C.border}` }}>
            {leads.map((lead, i) => {
              const loc = [lead.city, lead.state].filter(Boolean).join(", ") || "—";
              const service = lead.estimatedService
                ? RESEARCH_SERVICE_LABEL[String(lead.estimatedService)] ?? String(lead.estimatedService)
                : "—";
              return (
                <div
                  key={lead.id as number}
                  style={{
                    background: C.glass,
                    padding: "1rem 1.25rem",
                    borderBottom: i < leads.length - 1 ? `1px solid ${C.border}` : "none",
                  }}
                >
                  <p style={{ fontSize: "0.875rem", color: C.cream }}>{loc} · {service}</p>
                  <p style={{ fontSize: "0.8125rem", color: C.creamSubtle, marginTop: "0.25rem" }}>
                    {fmtDate(String(lead.createdAt))} · {String(lead.source)} · {RESEARCH_STATUS_LABEL[String(lead.status)] ?? lead.status}
                  </p>
                  {lead.leadUrl && (
                    <a
                      href={String(lead.leadUrl).startsWith("http") ? String(lead.leadUrl) : `https://${lead.leadUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: "0.6875rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.goldDim, textDecoration: "none", marginTop: "0.5rem", display: "block" }}
                    >
                      Open URL
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
