import type { ReactNode } from "react";
import Link from "next/link";
import type { WeeklyReview } from "@/lib/rituals";
import { DelightMoment } from "./DelightMoment";
import { RitualReadingTime } from "./RitualReadingTime";
import { RitualShell } from "./RitualShell";

function ReviewSection({
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
    <section className="kxd-os-ritual-review__section">
      <h2 className="kxd-os-ritual-review__label">{label}</h2>
      {isEmpty ? <p className="kxd-os-ritual-review__empty">{empty}</p> : children}
    </section>
  );
}

export function ReviewModeScreen({ review }: { review: WeeklyReview }) {
  const intelligence = review.intelligence;

  return (
    <RitualShell mode="review">
      <article className="kxd-os-ritual-review">
        <header className="kxd-os-ritual-review__hero">
          <RitualReadingTime label={review.readingEstimate.label} />
          <p className="kxd-os-ritual-review__greeting">{review.greeting}</p>
          <h1 className="kxd-os-ritual-review__title">Weekly Review</h1>
          <p className="kxd-os-ritual-review__week">{review.weekLabel}</p>
          <p className="kxd-os-ritual-review__lead">
            What happened this week — and what it tells us about the business.
          </p>
          {intelligence ? (
            <p className="kxd-os-ritual-intelligence__context">{intelligence.contextSummary}</p>
          ) : null}
        </header>

        {intelligence ? (
          <>
            <ReviewSection
              label="Meaningful changes"
              isEmpty={intelligence.meaningfulChanges.length === 0}
              empty="No significant movement detected this week."
            >
              <div className="kxd-os-ritual-review__prose">
                {intelligence.meaningfulChanges.map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </ReviewSection>

            <ReviewSection
              label="Recurring patterns"
              isEmpty={intelligence.patterns.length === 0}
              empty="No recurring patterns surfaced in observation history."
            >
              <ul className="kxd-os-ritual-review__list">
                {intelligence.patterns.map((pattern) => (
                  <li key={pattern.id} className="kxd-os-ritual-review__item">
                    <span className="kxd-os-ritual-review__item-title">{pattern.label}</span>
                    <span className="kxd-os-ritual-review__item-meta">{pattern.description}</span>
                  </li>
                ))}
              </ul>
            </ReviewSection>

            <ReviewSection
              label="Stable areas"
              isEmpty={intelligence.stableAreas.length === 0}
              empty="No persistent stable signals this week."
            >
              <ul className="kxd-os-ritual-review__lessons">
                {intelligence.stableAreas.map((area, index) => (
                  <li key={index}>{area}</li>
                ))}
              </ul>
            </ReviewSection>
          </>
        ) : null}

        {review.businessProgress.length > 0 ? (
          <ReviewSection label="Business movement">
            <div className="kxd-os-ritual-review__prose">
              {review.businessProgress.map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </ReviewSection>
        ) : null}

        <ReviewSection
          label="Completed work"
          isEmpty={review.completedWork.length === 0}
          empty="No work completed this week yet."
        >
          <ul className="kxd-os-ritual-review__list">
            {review.completedWork.map((item) => (
              <li key={item.id} className="kxd-os-ritual-review__item">
                <span className="kxd-os-ritual-review__item-title">{item.title}</span>
                <span className="kxd-os-ritual-review__item-meta">{item.clientName}</span>
              </li>
            ))}
          </ul>
        </ReviewSection>

        <ReviewSection
          label="Relationship progress"
          isEmpty={review.relationshipProgress.length === 0}
          empty="Quiet week on the relationship timeline."
        >
          <ul className="kxd-os-ritual-review__list">
            {review.relationshipProgress.map((item) => (
              <li key={item.id} className="kxd-os-ritual-review__item">
                <span className="kxd-os-ritual-review__item-title">{item.title}</span>
                {item.detail ? (
                  <span className="kxd-os-ritual-review__item-meta">{item.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </ReviewSection>

        <ReviewSection
          label="Wins"
          isEmpty={review.wins.length === 0}
          empty="A steady week — consistency counts."
        >
          <ul className="kxd-os-ritual-review__wins">
            {review.wins.map((win) => (
              <li key={win.id}>
                <p className="kxd-os-ritual-review__win-label">{win.label}</p>
                {win.detail ? <p className="kxd-os-ritual-review__win-detail">{win.detail}</p> : null}
              </li>
            ))}
          </ul>
        </ReviewSection>

        {review.risks.length > 0 ? (
          <ReviewSection label="Risks to watch">
            <ul className="kxd-os-ritual-review__list">
              {review.risks.map((risk) => (
                <li key={risk.id} className="kxd-os-ritual-review__item">
                  <span className="kxd-os-ritual-review__item-title">{risk.title}</span>
                  <span className="kxd-os-ritual-review__item-meta">{risk.reason}</span>
                </li>
              ))}
            </ul>
          </ReviewSection>
        ) : null}

        {review.lessons.length > 0 ? (
          <ReviewSection label="Observations">
            <ul className="kxd-os-ritual-review__lessons">
              {review.lessons.map((lesson) => (
                <li key={lesson.id}>{lesson.observation}</li>
              ))}
            </ul>
          </ReviewSection>
        ) : null}

        <ReviewSection
          label="Next week's priorities"
          isEmpty={review.nextWeekPriorities.length === 0}
          empty="No priorities queued. A clear runway ahead."
        >
          <ol className="kxd-os-ritual-review__priorities">
            {review.nextWeekPriorities.map((item) => (
              <li key={item.id}>
                {item.href ? (
                  <Link href={item.href} className="kxd-os-ritual-review__priority-link">
                    {item.title}
                  </Link>
                ) : (
                  <span>{item.title}</span>
                )}
                <span className="kxd-os-ritual-review__item-meta">{item.reason}</span>
              </li>
            ))}
          </ol>
        </ReviewSection>

        <DelightMoment message={review.affirmation} context="review-wins" />
      </article>
    </RitualShell>
  );
}
