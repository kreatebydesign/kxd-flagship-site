import {
  KxdBadge,
  KxdPage,
  KxdSurface,
  type KxdBadgeVariant,
} from "@/components/os";
import { PLAYBOOKS, type PlaybookBadge } from "@/lib/playbooks";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";

const PLAYBOOK_BADGE_VARIANT: Record<PlaybookBadge, KxdBadgeVariant> = {
  "Core SOP": "status",
  Launch: "tier",
  SEO: "tier",
  "Client Success": "success",
  Emergency: "critical",
};

export function PlaybooksScreen() {
  return (
    <OperationsShell activeId="playbooks">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Internal Playbooks"
          title="SOP & Playbook Library"
          lead="Core KXD operating procedures — launch, DNS, analytics, client success, and emergency response. Reference checklists for consistent delivery across the team."
        />

        <div className="kxd-os-ops-playbook-grid">
          {PLAYBOOKS.map((playbook) => (
            <KxdSurface
              key={playbook.id}
              variant="glass"
              className="kxd-os-ops-playbook-card"
            >
              <div className="kxd-os-ops-playbook-card__head">
                <h2 className="kxd-os-ops-playbook-card__title">{playbook.title}</h2>
                <KxdBadge variant={PLAYBOOK_BADGE_VARIANT[playbook.badge]}>
                  {playbook.badge}
                </KxdBadge>
              </div>
              <p className="kxd-os-ops-playbook-card__description">{playbook.description}</p>
              <p className="kxd-os-section__label kxd-os-ops-playbook-checklist__label">
                Checklist
              </p>
              <ul className="kxd-os-ops-playbook-checklist">
                {playbook.checklist.map((item) => (
                  <li key={item} className="kxd-os-ops-playbook-checklist__item">
                    <span className="kxd-os-ops-playbook-checklist__marker" aria-hidden>
                      ◆
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </KxdSurface>
          ))}
        </div>

        <p className="kxd-os-ops-footnote">
          Static reference library · Edit playbooks in{" "}
          <code className="kxd-os-ops-footnote__code">lib/playbooks.ts</code>
        </p>
      </KxdPage>
    </OperationsShell>
  );
}
