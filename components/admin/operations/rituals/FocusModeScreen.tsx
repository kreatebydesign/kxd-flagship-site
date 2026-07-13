import Link from "next/link";
import type { ReactNode } from "react";
import type { FocusContext } from "@/lib/rituals";
import { WhyThisDisclosure } from "@/components/admin/executive-intelligence/WhyThisDisclosure";
import { RitualIntelligenceList } from "./RitualIntelligenceProse";
import { DelightMoment } from "./DelightMoment";
import { RitualShell } from "./RitualShell";

function FocusSection({
  label,
  children,
  empty,
  isEmpty,
}: {
  label: string;
  children: ReactNode;
  empty?: string;
  isEmpty?: boolean;
}) {
  return (
    <section className="kxd-os-ritual-focus__section">
      <h2 className="kxd-os-ritual-focus__label">{label}</h2>
      {isEmpty ? <p className="kxd-os-ritual-focus__empty">{empty}</p> : children}
    </section>
  );
}

export function FocusModeScreen({ focus }: { focus: FocusContext }) {
  const intelligence = focus.intelligence;
  const primary = focus.primaryDecision ?? focus.urgentDecisions[0] ?? null;
  const allClear =
    !intelligence?.attentionAreas.length &&
    focus.todaysWork.length === 0 &&
    focus.blockers.length === 0 &&
    !primary;

  const lead = primary
    ? primary.whyThisBlock ?? primary.reason
    : intelligence
      ? `${intelligence.postureLabel} — ${intelligence.postureDescription}`
      : allClear
        ? "Nothing needs your attention right now. Execute when ready."
        : "What matters today — nothing else.";

  return (
    <RitualShell mode="focus">
      <article className="kxd-os-ritual-focus">
        <header className="kxd-os-ritual-focus__hero">
          <p className="kxd-os-ritual-focus__greeting">{focus.greeting}</p>
          <p className="kxd-os-ritual-focus__date">{focus.dateDisplay}</p>
          <p className="kxd-os-ritual-focus__lead">{lead}</p>
        </header>

        {primary ? (
          <section className="kxd-os-ritual-focus__section kxd-os-ritual-focus__section--primary">
            <h2 className="kxd-os-ritual-focus__label">Focus on this</h2>
            <p className="kxd-os-ritual-focus__primary-title">{primary.title}</p>
            <p className="kxd-os-ritual-focus__primary-reason">{primary.reason}</p>
            {primary.whatToIgnore ? (
              <p className="kxd-os-ritual-focus__guidance">
                <span className="kxd-os-ritual-focus__guidance-label">Ignore for now</span>
                {primary.whatToIgnore}
              </p>
            ) : null}
            {primary.whenToStop ? (
              <p className="kxd-os-ritual-focus__guidance">
                <span className="kxd-os-ritual-focus__guidance-label">Stop when</span>
                {primary.whenToStop}
              </p>
            ) : null}
            {primary.href ? (
              <p className="kxd-os-ritual-focus__link">
                <Link href={primary.href}>Open</Link>
              </p>
            ) : null}
            <WhyThisDisclosure explainability={focus.explainability} />
          </section>
        ) : null}

        {intelligence ? (
          <>
            <RitualIntelligenceList
              label="Important domains"
              items={intelligence.domains}
              empty="No dominant domains in the current executive state."
            />
            <RitualIntelligenceList
              label="Areas of attention"
              items={intelligence.attentionAreas}
              empty="No areas currently rise to executive attention."
            />
            <section className="kxd-os-ritual-intelligence__section">
              <h2 className="kxd-os-ritual-intelligence__label">Execution landscape</h2>
              <div className="kxd-os-ritual-intelligence__prose">
                <p>{intelligence.executionLandscape}</p>
              </div>
            </section>
          </>
        ) : null}

        <FocusSection
          label="Today's work"
          isEmpty={focus.todaysWork.length === 0}
          empty="No work scheduled for today."
        >
          <ul className="kxd-os-ritual-focus__list kxd-os-ritual-focus__list--work">
            {focus.todaysWork.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="kxd-os-ritual-focus__work-row">
                  <span className="kxd-os-ritual-focus__work-title">{item.title}</span>
                  <span className="kxd-os-ritual-focus__work-meta">
                    {item.clientName} · {item.status.replace(/-/g, " ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </FocusSection>

        {focus.blockers.length > 0 ? (
          <FocusSection label="Blocked work">
            <ul className="kxd-os-ritual-focus__list kxd-os-ritual-focus__list--blockers">
              {focus.blockers.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="kxd-os-ritual-focus__work-row">
                    <span className="kxd-os-ritual-focus__work-title">{item.title}</span>
                    <span className="kxd-os-ritual-focus__work-meta">{item.clientName}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </FocusSection>
        ) : null}

        <DelightMoment
          message={focus.affirmation}
          context={allClear ? "focus-clear" : undefined}
        />
      </article>
    </RitualShell>
  );
}
