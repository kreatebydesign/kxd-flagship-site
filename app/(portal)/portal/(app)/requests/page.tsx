import { redirect } from "next/navigation";
import { NewRequestForm } from "@/components/portal/NewRequestForm";
import { getPortalProjects, getPortalRequests } from "@/lib/portal/data";
import { fmtPortalDate, REQUEST_STATUS_COLOR, statusLabel } from "@/lib/portal/format";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalRequestsPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const [requests, projects] = await Promise.all([
    getPortalRequests(session),
    getPortalProjects(session),
  ]);

  const projectOptions = projects.map((p) => ({
    id: p.id as number,
    name: String(p.projectName ?? "Project"),
  }));

  return (
    <div className="kxd-container py-10 lg:py-14">
      <div className="mb-8">
        <p className="kxd-eyebrow" style={{ opacity: 0.55 }}>Requests</p>
        <h1 className="mt-2 font-serif font-light" style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)", color: "var(--kxd-cream)" }}>
          Client Requests
        </h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div>
          {requests.length === 0 ? (
            <p className="font-sans" style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.3)" }}>
              No requests yet.
            </p>
          ) : (
            <div style={{ border: "1px solid var(--kxd-border-white)" }}>
              {requests.map((req, i) => {
                const status = req.status as string;
                return (
                  <div
                    key={req.id as number}
                    className="px-5 py-4"
                    style={{
                      background: "var(--kxd-black-elevated)",
                      borderBottom: i < requests.length - 1 ? "1px solid var(--kxd-border-white)" : "none",
                    }}
                  >
                    <p className="font-sans font-light" style={{ fontSize: "0.9375rem", color: "var(--kxd-cream)" }}>
                      {req.requestTitle as string}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      <span className="font-sans uppercase" style={{ fontSize: "0.4375rem", letterSpacing: "0.12em", color: REQUEST_STATUS_COLOR[status] ?? "rgba(255,255,255,0.4)" }}>
                        {statusLabel(status)}
                      </span>
                      <span className="font-sans" style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.25)" }}>
                        Submitted {fmtPortalDate(req.createdAt as string)}
                      </span>
                      <span className="font-sans" style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.25)" }}>
                        Updated {fmtPortalDate(req.updatedAt as string)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <aside style={{ background: "var(--kxd-black-elevated)", border: "1px solid var(--kxd-border-white)", padding: "1.5rem" }}>
          <p className="mb-5 font-sans uppercase" style={{ fontSize: "0.5625rem", letterSpacing: "0.14em", color: "var(--kxd-gold)", opacity: 0.75 }}>
            New Request
          </p>
          <NewRequestForm projects={projectOptions} />
        </aside>
      </div>
    </div>
  );
}
