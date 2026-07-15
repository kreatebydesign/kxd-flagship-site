"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import type { WebsiteWorkspacePageDefinition } from "@/lib/ces/modules/website-workspace/types";
import { formatWorkspaceLastUpdated } from "@/lib/ces/modules/website-workspace/catalog";
import { portalCopy } from "@/lib/ces/copy/portal-language";
import { CesHero, CesPage } from "@/components/ces/primitives";
import { WebsiteWorkspaceEditPanel } from "./WebsiteWorkspaceEditPanel";

type Props = {
  profile: ResolvedExperienceProfile;
  page: WebsiteWorkspacePageDefinition;
  websiteUrl: string | null;
};

export function WebsiteWorkspacePageView({ profile, page, websiteUrl }: Props) {
  const router = useRouter();
  const t = profile.terminology;
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const activeSection =
    page.sections.find((section) => section.id === activeSectionId) ?? null;

  function openSection(sectionId: string, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setActiveSectionId(sectionId);
  }

  function closeSection() {
    setActiveSectionId(null);
  }

  return (
    <CesPage className="kxd-ws">
      <CesHero
        eyebrow="Website Workspace"
        title={page.title}
        lead={page.description}
        presence
        actions={
          <div className="kxd-ces-hero__action-row">
            <Link href="/portal/website-workspace" className="kxd-ces-btn kxd-ces-btn--ghost">
              All pages
            </Link>
            {websiteUrl ? (
              <a
                href={`${websiteUrl.replace(/\/$/, "")}${page.path === "/" ? "" : page.path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="kxd-ces-btn kxd-ces-btn--ghost"
              >
                View live page
              </a>
            ) : null}
          </div>
        }
      />

      <section className="kxd-ces-section">
        <header className="kxd-ces-section__head kxd-ws-page-intro">
          <div>
            <p className="kxd-ws-page-path">{page.path}</p>
            <p className="kxd-ws-section-lead">
              Last updated {formatWorkspaceLastUpdated(page.lastUpdated)} ·{" "}
              {page.sections.length} editable sections
            </p>
          </div>
        </header>

        <ul className="kxd-ws-section-grid">
          {page.sections.map((section) => (
            <li key={section.id} className="kxd-ws-section-card">
              <div className="kxd-ws-section-card__copy">
                <header>
                  <h2>{section.title}</h2>
                  {section.current.heading ? (
                    <p className="kxd-ws-section-card__heading">{section.current.heading}</p>
                  ) : null}
                </header>
                {section.current.body ? (
                  <p className="kxd-ws-section-card__body">{section.current.body}</p>
                ) : null}
                {section.current.cta ? (
                  <p className="kxd-ws-section-card__cta">{section.current.cta}</p>
                ) : null}
                <button
                  type="button"
                  className="kxd-ces-btn kxd-ces-btn--primary"
                  onClick={(event) => openSection(section.id, event.currentTarget)}
                >
                  {portalCopy(t, "website-workspace.cta.edit", "Edit request")}
                </button>
              </div>
              {section.current.imageUrl ? (
                <div className="kxd-ws-section-card__media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={section.current.imageUrl} alt={section.current.imageAlt || ""} />
                </div>
              ) : (
                <div className="kxd-ws-section-card__media kxd-ws-section-card__media--empty">
                  <span>No image</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <WebsiteWorkspaceEditPanel
        open={activeSectionId != null}
        pageSlug={page.slug}
        pageTitle={page.title}
        section={activeSection}
        returnFocusRef={triggerRef}
        onClose={closeSection}
        onSubmitted={(requestId) => {
          router.push(`/portal/website-workspace/requests/${requestId}`);
        }}
      />
    </CesPage>
  );
}
