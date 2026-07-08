import Link from "next/link";
import type { ReactNode } from "react";
import type { FocusContext } from "@/lib/rituals";
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
  const allClear =
    !intelligence?.attentionAreas.length &&
    focus.todaysWork.length === 0 &&
    focus.blockers.length === 0;

  const lead = intelligence
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
