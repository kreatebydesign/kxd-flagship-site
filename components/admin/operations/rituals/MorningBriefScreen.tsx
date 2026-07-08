import type { ExecutiveBriefing } from "@/lib/intelligence/briefings";
import type { MorningBriefIntelligence } from "@/lib/rituals/intelligence";
import {
  estimateReadingMinutes,
  formatReadingTime,
  getDelightAffirmation,
} from "@/lib/rituals";
import { ExecutiveHealthSummary } from "../intelligence/ExecutiveHealthSummary";
import { DelightMoment } from "./DelightMoment";
import { RitualIntelligenceSection } from "./RitualIntelligenceProse";
import { RitualReadingTime } from "./RitualReadingTime";
import { RitualShell } from "./RitualShell";

export function MorningBriefScreen({
  briefing,
  intelligence,
}: {
  briefing: ExecutiveBriefing;
  intelligence: MorningBriefIntelligence;
}) {
  const minutes = estimateReadingMinutes(intelligence.readingTexts);
  const readingLabel = formatReadingTime(minutes);

  const isClear = intelligence.tone === "calm";

  const affirmation = getDelightAffirmation(isClear ? "morning-clear" : "morning-busy");

  return (
    <RitualShell mode="morning">
      <article className="kxd-os-ritual-morning">
        <RitualReadingTime label={readingLabel} />

        <header className="kxd-os-ritual-intelligence__hero">
          <p className="kxd-os-ritual-intelligence__greeting">{briefing.greeting}</p>
          <p className="kxd-os-ritual-intelligence__meta">
            {briefing.dateDisplay} · {briefing.timeDisplay}
          </p>
          <h1 className="kxd-os-ritual-intelligence__headline">
            {intelligence.sections[0]?.paragraphs[0] ?? intelligence.postureLabel}
          </h1>
          <p className="kxd-os-ritual-intelligence__context">{intelligence.contextSummary}</p>
          <p className="kxd-os-ritual-intelligence__posture">
            Business posture: {intelligence.postureLabel}
          </p>
        </header>

        {intelligence.sections.map((section) => (
          <RitualIntelligenceSection key={section.id} block={section} />
        ))}

        <ExecutiveHealthSummary snapshot={briefing.healthSnapshot} variant="ritual" />

        <DelightMoment message={affirmation} context={isClear ? "morning-clear" : "morning-busy"} />
      </article>
    </RitualShell>
  );
}
