"use client";

import Link from "next/link";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import type { WebsiteWorkspaceRequestDetail } from "@/lib/ces/modules/website-workspace/types";
import { CesHero, CesPage } from "@/components/ces/primitives";
import { WebsiteWorkspaceStatus } from "./WebsiteWorkspaceStatus";

type Props = {
  profile: ResolvedExperienceProfile;
  request: WebsiteWorkspaceRequestDetail;
};

function ContentBlock({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="kxd-ws-snapshot__block">
      <span>{label}</span>
      <p>{value?.trim() || "—"}</p>
    </div>
  );
}

export function WebsiteWorkspaceRequestDetailView({ profile, request }: Props) {
  void profile;

  return (
    <CesPage className="kxd-ws">
      <CesHero
        eyebrow="Update request"
        title={request.title}
        lead={`${request.pageTitle} · ${request.sectionTitle}`}
        presence
        actions={
          <div className="kxd-ces-hero__action-row">
            <WebsiteWorkspaceStatus status={request.status} />
            <Link href="/portal/website-workspace" className="kxd-ces-btn kxd-ces-btn--ghost">
              Back to workspace
            </Link>
          </div>
        }
      />

      <section className="kxd-ces-section kxd-ws-detail-grid">
        <article className="kxd-ws-detail-card">
          <h2>Current content</h2>
          <ContentBlock label="Heading" value={request.current.heading} />
          <ContentBlock label="Body" value={request.current.body} />
          <ContentBlock label="CTA" value={request.current.cta} />
          {request.current.imageUrl ? (
            <div className="kxd-ws-snapshot__media">
              <span>Image</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={request.current.imageUrl} alt={request.current.imageAlt || ""} />
            </div>
          ) : null}
        </article>

        <article className="kxd-ws-detail-card">
          <h2>Requested changes</h2>
          <ContentBlock label="Heading" value={request.requested.heading} />
          <ContentBlock label="Body" value={request.requested.body} />
          <ContentBlock label="CTA" value={request.requested.cta} />
          <ContentBlock label="Notes" value={request.notes} />
          {request.attachments.length > 0 ? (
            <div className="kxd-ws-detail-attachments">
              <span>Attachments</span>
              <ul>
                {request.attachments.map((item) => (
                  <li key={item.id}>
                    {item.isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.url} alt="" />
                    ) : null}
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      {item.filename}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </article>
      </section>

      <section className="kxd-ces-section" aria-labelledby="ws-progress-title">
        <header className="kxd-ces-section__head">
          <h2 id="ws-progress-title" className="kxd-ces-section__title">
            Progress
          </h2>
        </header>
        {request.timeline.length === 0 ? (
          <p className="kxd-ws-section-lead">
            Submitted{" "}
            {new Date(request.submittedAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
            {request.submittedBy ? ` by ${request.submittedBy}` : ""}. Status updates will appear
            here.
          </p>
        ) : (
          <ol className="kxd-ws-timeline">
            {request.timeline.map((event) => (
              <li key={event.id}>
                <div>
                  <strong>{event.label}</strong>
                  {event.detail ? <p>{event.detail}</p> : null}
                </div>
                <time dateTime={event.at}>
                  {new Date(event.at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </CesPage>
  );
}
