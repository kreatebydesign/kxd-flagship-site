import Link from "next/link";
import type { ReactNode } from "react";
import type { FocusContext } from "@/lib/rituals";
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
  const allClear =
    focus.priorities.length === 0 &&
    focus.todaysWork.length === 0 &&
    focus.blockers.length === 0;

  return (
    <RitualShell mode="focus">
      <article className="kxd-os-ritual-focus">
        <header className="kxd-os-ritual-focus__hero">
          <p className="kxd-os-ritual-focus__greeting">{focus.greeting}</p>
          <p className="kxd-os-ritual-focus__date">{focus.dateDisplay}</p>
          <p className="kxd-os-ritual-focus__lead">
            {allClear
              ? "Nothing needs your attention right now. Execute when ready."
              : "What matters today — nothing else."}
          </p>
        </header>

        <FocusSection
          label="Today's priorities"
          isEmpty={focus.priorities.length === 0}
          empty="No urgent priorities. The studio is clear."
        >
          <ul className="kxd-os-ritual-focus__list">
            {focus.priorities.map((item, index) => (
              <li key={item.id} className="kxd-os-ritual-focus__item">
                <span className="kxd-os-ritual-focus__index">{index + 1}</span>
                <div className="kxd-os-ritual-focus__item-body">
                  {item.href ? (
                    <Link href={item.href} className="kxd-os-ritual-focus__title">
                      {item.title}
                    </Link>
                  ) : (
                    <p className="kxd-os-ritual-focus__title">{item.title}</p>
                  )}
                  <p className="kxd-os-ritual-focus__reason">{item.reason}</p>
                </div>
              </li>
            ))}
          </ul>
        </FocusSection>

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

        {focus.urgentDecisions.length > 0 ? (
          <FocusSection label="Decisions waiting">
            <ul className="kxd-os-ritual-focus__list">
              {focus.urgentDecisions.map((item) => (
                <li key={item.id} className="kxd-os-ritual-focus__item">
                  <div className="kxd-os-ritual-focus__item-body">
                    {item.href ? (
                      <Link href={item.href} className="kxd-os-ritual-focus__title">
                        {item.title}
                      </Link>
                    ) : (
                      <p className="kxd-os-ritual-focus__title">{item.title}</p>
                    )}
                    <p className="kxd-os-ritual-focus__reason">{item.reason}</p>
                  </div>
                </li>
              ))}
            </ul>
          </FocusSection>
        ) : null}

        {focus.blockers.length > 0 ? (
          <FocusSection label="Blockers">
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
