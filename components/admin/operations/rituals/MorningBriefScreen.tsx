import type { ExecutiveBriefing } from "@/lib/intelligence/briefings";
import {
  estimateReadingMinutes,
  formatReadingTime,
  getDelightAffirmation,
} from "@/lib/rituals";
import { ExecutiveHealthSummary } from "../intelligence/ExecutiveHealthSummary";
import { ExecutiveInsights } from "../intelligence/ExecutiveInsights";
import { ExecutiveNarrativeBlock } from "../intelligence/ExecutiveNarrative";
import { PrimaryRecommendation } from "../intelligence/PrimaryRecommendation";
import { DelightMoment } from "./DelightMoment";
import { RitualReadingTime } from "./RitualReadingTime";
import { RitualShell } from "./RitualShell";

export function MorningBriefScreen({ briefing }: { briefing: ExecutiveBriefing }) {
  const readingTexts = [
    briefing.narrative.text,
    briefing.primaryRecommendation?.title ?? "",
    briefing.primaryRecommendation?.reason ?? "",
    ...briefing.executiveInsights.map((i) => i.observation),
  ];
  const minutes = estimateReadingMinutes(readingTexts);
  const readingLabel = formatReadingTime(minutes);

  const isClear =
    briefing.topPriorities.length === 0 &&
    briefing.businessRisks.length === 0 &&
    !briefing.primaryRecommendation;

  const affirmation = getDelightAffirmation(isClear ? "morning-clear" : "morning-busy");

  return (
    <RitualShell mode="morning">
      <article className="kxd-os-ritual-morning">
        <RitualReadingTime label={readingLabel} />

        <ExecutiveNarrativeBlock
          narrative={briefing.narrative}
          greeting={briefing.greeting}
          dateDisplay={briefing.dateDisplay}
          timeDisplay={briefing.timeDisplay}
          confidence={briefing.confidence}
          variant="ritual"
        />

        <ExecutiveHealthSummary snapshot={briefing.healthSnapshot} variant="ritual" />

        <PrimaryRecommendation recommendation={briefing.primaryRecommendation} />

        <ExecutiveInsights insights={briefing.executiveInsights} variant="ritual" />

        <DelightMoment message={affirmation} context={isClear ? "morning-clear" : "morning-busy"} />
      </article>
    </RitualShell>
  );
}
