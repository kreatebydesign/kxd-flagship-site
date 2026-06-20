import { redirect } from "next/navigation";
import { getPortalDeliverables } from "@/lib/portal/data";
import { DELIVERABLE_STATUS_COLOR, fmtPortalDate, statusLabel } from "@/lib/portal/format";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

function DeliverableList({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<Record<string, unknown>>;
  empty: string;
}) {
  return (
    <section>
      <p className="mb-4 font-sans uppercase" style={{ fontSize: "0.5625rem", letterSpacing: "0.14em", color: "var(--kxd-gold)", opacity: 0.75 }}>
        {title}
      </p>
      {items.length === 0 ? (
        <p className="font-sans" style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.25)" }}>{empty}</p>
      ) : (
        <div style={{ border: "1px solid var(--kxd-border-white)" }}>
          {items.map((item, i) => {
            const status = item.status as string;
            return (
              <div
                key={item.id as number}
                className="px-5 py-4"
                style={{
                  background: "var(--kxd-black-elevated)",
                  borderBottom: i < items.length - 1 ? "1px solid var(--kxd-border-white)" : "none",
                }}
              >
                <p className="font-sans font-light" style={{ fontSize: "0.9375rem", color: "var(--kxd-cream)" }}>
                  {item.title as string}
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  <span className="font-sans uppercase" style={{ fontSize: "0.4375rem", letterSpacing: "0.12em", color: DELIVERABLE_STATUS_COLOR[status] ?? "rgba(255,255,255,0.4)" }}>
                    {statusLabel(status)}
                  </span>
                  {item.completedDate != null && item.completedDate !== "" && (
                    <span className="font-sans" style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.25)" }}>
                      Completed {fmtPortalDate(String(item.completedDate))}
                    </span>
                  )}
                  {item.completedDate == null && item.dueDate != null && item.dueDate !== "" && (
                    <span className="font-sans" style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.25)" }}>
                      Due {fmtPortalDate(String(item.dueDate))}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default async function PortalDeliverablesPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const deliverables = await getPortalDeliverables(session);
  const pending = deliverables.filter((d) => d.status !== "complete");
  const completed = deliverables.filter((d) => d.status === "complete");

  return (
    <div className="kxd-container py-10 lg:py-14">
      <div className="mb-8">
        <p className="kxd-eyebrow" style={{ opacity: 0.55 }}>Deliverables</p>
        <h1 className="mt-2 font-serif font-light" style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)", color: "var(--kxd-cream)" }}>
          Monthly Deliverables
        </h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <DeliverableList title="Pending" items={pending} empty="No pending deliverables." />
        <DeliverableList title="Completed" items={completed} empty="No completed deliverables yet." />
      </div>
    </div>
  );
}
