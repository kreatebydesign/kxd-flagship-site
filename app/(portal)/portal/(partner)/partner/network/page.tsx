import { redirect } from "next/navigation";
import { getPartnerSession } from "@/lib/portal/partner/access";
import { loadNetworkDirectoryForActivePartner } from "@/lib/portal/partner/network-directory";

export const dynamic = "force-dynamic";

function markInitials(displayName: string): string {
  const parts = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "·";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export default async function PartnerNetworkPage() {
  const session = await getPartnerSession();
  if (!session) redirect("/portal/login");

  const directory = await loadNetworkDirectoryForActivePartner();
  const hasPeople = directory.members.length > 0;
  const hasWork = directory.selectedWork.length > 0;

  return (
    <div className="kxd-partner-page kxd-partner-page--network">
      <div className="kxd-partner-network-spread">
        <header className="kxd-partner-network-head">
          <p className="kxd-partner-network">KXD Network · Private access</p>
          <h1 className="kxd-partner-title">The Network</h1>
          <p className="kxd-partner-lead">
            A private registry of people and work KXD is proud to stand behind.
          </p>
        </header>

        <section
          className="kxd-partner-registry"
          aria-labelledby="kxd-network-registry-heading"
        >
          <h2
            className="kxd-partner-registry__kicker"
            id="kxd-network-registry-heading"
          >
            People
          </h2>
          {!hasPeople ? (
            <p className="kxd-partner-registry__empty">
              Quiet for now. Profiles appear when KXD publishes them.
            </p>
          ) : (
            <ol className="kxd-partner-registry__list">
              {directory.members.map((member) => (
                <li key={member.id} className="kxd-partner-registry__plate">
                  <div className="kxd-partner-registry__plate-top">
                    {member.markUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="kxd-partner-registry__mark"
                        src={member.markUrl}
                        alt=""
                        width={64}
                        height={64}
                      />
                    ) : (
                      <span
                        className="kxd-partner-registry__mark is-fallback"
                        aria-hidden
                      >
                        {markInitials(member.displayName)}
                      </span>
                    )}
                    <div className="kxd-partner-registry__identity">
                      <h3 className="kxd-partner-registry__name">
                        {member.displayName}
                      </h3>
                      {member.companyOrRole || member.cityMarket ? (
                        <p className="kxd-partner-registry__meta">
                          {[member.companyOrRole, member.cityMarket]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {member.profileLine ? (
                    <p className="kxd-partner-registry__line">
                      {member.profileLine}
                    </p>
                  ) : null}
                  {member.connectionLanes.length > 0 ? (
                    <p className="kxd-partner-registry__lanes">
                      {member.connectionLanes.join(" · ")}
                    </p>
                  ) : null}
                  {member.recognitions.length > 0 ? (
                    <p className="kxd-partner-registry__recog">
                      {member.recognitions.join(" · ")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section
          className={[
            "kxd-partner-selected",
            !hasWork ? "is-quiet" : "has-work",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-labelledby="kxd-selected-work-heading"
        >
          <h2
            className="kxd-partner-selected__title"
            id="kxd-selected-work-heading"
          >
            Selected work
          </h2>
          {!hasWork ? (
            <p className="kxd-partner-selected__empty">
              Approved work will land here.
            </p>
          ) : (
            <ol className="kxd-partner-selected__list">
              {directory.selectedWork.map((item) => (
                <li key={item.id} className="kxd-partner-selected__row">
                  <div
                    className={[
                      "kxd-partner-selected__main",
                      item.markUrl ? "" : "is-text-only",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {item.markUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="kxd-partner-selected__mark"
                        src={item.markUrl}
                        alt=""
                        width={44}
                        height={44}
                      />
                    ) : null}
                    <div className="kxd-partner-selected__copy">
                      {item.categoryMarket ? (
                        <p className="kxd-partner-selected__category">
                          {item.categoryMarket}
                        </p>
                      ) : null}
                      <h3 className="kxd-partner-selected__company">
                        {item.companyName}
                      </h3>
                      {item.workDescription ? (
                        <p className="kxd-partner-selected__work">
                          {item.workDescription}
                        </p>
                      ) : null}
                      <div className="kxd-partner-selected__meta">
                        {item.creditedMemberName ? (
                          <span>With {item.creditedMemberName}</span>
                        ) : null}
                        {item.websiteUrl ? (
                          <a
                            href={item.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="kxd-partner-selected__link"
                          >
                            Website
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
