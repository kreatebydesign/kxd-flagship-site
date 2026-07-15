"use client";

import Link from "next/link";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import type { WebsiteWorkspaceLandingData } from "@/lib/ces/modules/website-workspace/types";
import {
  formatWorkspaceRequestRef,
  formatWorkspaceSubmittedAt,
} from "@/lib/ces/modules/website-workspace/presentation";
import { portalCopy } from "@/lib/ces/copy/portal-language";
import { CesHero, CesPage } from "@/components/ces/primitives";
import { WebsiteWorkspaceStatus } from "./WebsiteWorkspaceStatus";

type Props = {
  profile: ResolvedExperienceProfile;
  data: WebsiteWorkspaceLandingData;
};

export function WebsiteWorkspaceLanding({ profile, data }: Props) {
  const t = profile.terminology;
  const eyebrow = portalCopy(t, "website-workspace.landing.eyebrow", "Website");
  const title = portalCopy(t, "website-workspace.landing.title", "Website Workspace");
  const lead = portalCopy(
    t,
    "website-workspace.landing.lead",
    "Request precise website updates by page and section — KXD reviews every change before anything goes live.",
  );

  return (
    <CesPage className="kxd-ws">
      <CesHero
        eyebrow={eyebrow}
        title={title}
        lead={lead}
        presence
        actions={
          data.websiteUrl ? (
            <a
              href={data.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="kxd-ces-btn kxd-ces-btn--ghost"
            >
              View live website
            </a>
          ) : null
        }
      />

      <section className="kxd-ces-section kxd-ws-pages" aria-labelledby="ws-pages-title">
        <header className="kxd-ces-section__head">
          <div>
            <h2 id="ws-pages-title" className="kxd-ces-section__title">
              Website pages
            </h2>
            <p className="kxd-ws-section-lead">
              Select a page to review its editable sections and submit an update request.
            </p>
          </div>
          {data.openRequestCount > 0 ? (
            <p className="kxd-ws-open-count">
              {data.openRequestCount} open request{data.openRequestCount === 1 ? "" : "s"}
            </p>
          ) : null}
        </header>

        {data.pages.length === 0 ? (
          <div className="kxd-ces-empty">
            <p className="kxd-ces-empty__title">Workspace catalog coming soon</p>
            <p className="kxd-ces-empty__lead">
              Your website structure will appear here once prepared for collaboration.
            </p>
          </div>
        ) : (
          <ul className="kxd-ws-page-grid">
            {data.pages.map((page) => (
              <li key={page.slug}>
                <Link href={page.href} className="kxd-ws-page-card">
                  <div className="kxd-ws-page-card__top">
                    <h3>{page.title}</h3>
                    <span>{page.path}</span>
                  </div>
                  <p>{page.description}</p>
                  <div className="kxd-ws-page-card__meta">
                    <span>Updated {page.lastUpdated}</span>
                    <span>
                      {page.sectionCount} section{page.sectionCount === 1 ? "" : "s"}
                    </span>
                    {page.openRequestCount > 0 ? (
                      <span className="kxd-ws-page-card__active">
                        {page.openRequestCount} active
                      </span>
                    ) : null}
                  </div>
                  <span className="kxd-ws-page-card__action">
                    {portalCopy(t, "website-workspace.cta.open", "Open page")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="kxd-ces-section" aria-labelledby="ws-requests-title">
        <header className="kxd-ces-section__head">
          <h2 id="ws-requests-title" className="kxd-ces-section__title">
            {portalCopy(t, "website-workspace.requests.title", "Update requests")}
          </h2>
        </header>

        {data.recentRequests.length === 0 ? (
          <div className="kxd-ws-empty-requests">
            <p>No update requests yet. Open a page to begin a calm, structured request.</p>
          </div>
        ) : (
          <ul className="kxd-ws-request-list">
            {data.recentRequests.map((request) => (
              <li key={request.id}>
                <Link href={request.href} className="kxd-ws-request-row">
                  <div className="kxd-ws-request-row__copy">
                    <p className="kxd-ws-request-row__ref">
                      {formatWorkspaceRequestRef(request.id)}
                    </p>
                    <h3>{request.title}</h3>
                    <p>
                      {request.pageTitle} · {request.sectionTitle}
                    </p>
                    <p className="kxd-ws-request-row__meta">
                      Submitted by {request.submittedBy} ·{" "}
                      {formatWorkspaceSubmittedAt(request.submittedAt)}
                    </p>
                  </div>
                  <WebsiteWorkspaceStatus status={request.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </CesPage>
  );
}
