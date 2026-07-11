import type { ExecutiveBriefing } from "@/lib/intelligence/briefings";
import type { MorningBriefIntelligence } from "@/lib/rituals/intelligence";
import type { MorningClientActivity } from "@/lib/rituals/morning-activity";
import type { MorningFirstAction } from "@/lib/rituals/morning-first-action";
import type { MorningExecutiveSnapshot } from "@/lib/rituals/morning-snapshot";
import type { MorningBriefVoice } from "@/lib/rituals/morning-welcome";
import {
  estimateReadingMinutes,
  formatReadingTime,
  getDelightAffirmation,
} from "@/lib/rituals";
import { ExecutiveHealthSummary } from "../intelligence/ExecutiveHealthSummary";
import { DelightMoment } from "./DelightMoment";
import { MorningClientActivitySection } from "./MorningClientActivitySection";
import { MorningExecutiveSnapshotSection } from "./MorningExecutiveSnapshotSection";
import { MorningFirstActionSection } from "./MorningFirstActionSection";
import { RitualIntelligenceSection } from "./RitualIntelligenceProse";
import { RitualReadingTime } from "./RitualReadingTime";
import { RitualShell } from "./RitualShell";

export function MorningBriefScreen({
  briefing,
  intelligence,
  activity,
  snapshot,
  firstAction,
  voice,
}: {
  briefing: ExecutiveBriefing;
  intelligence: MorningBriefIntelligence;
  activity: MorningClientActivity;
  snapshot: MorningExecutiveSnapshot;
  firstAction: MorningFirstAction;
  voice: MorningBriefVoice;
}) {
  const minutes = estimateReadingMinutes([
    voice.greeting,
    voice.welcome,
    ...intelligence.readingTexts,
    activity.summary,
    ...activity.groups.flatMap((g) =>
      g.lines.map((l) => `${g.clientName} ${l.label} ${l.title}`),
    ),
    ...snapshot.metrics.map((m) => `${m.label} ${m.value}`),
    firstAction.label,
    firstAction.clientName ?? "",
    firstAction.itemTitle ?? "",
  ]);
  const readingLabel = formatReadingTime(minutes);

  const isClear = intelligence.tone === "calm" && !activity.hasActivity && !firstAction.hasAction;

  const affirmation = getDelightAffirmation(isClear ? "morning-clear" : "morning-busy");

  return (
    <RitualShell mode="morning">
      <article className="kxd-os-ritual-morning kxd-os-ritual-morning--v2">
        <RitualReadingTime label={readingLabel} />

        <header className="kxd-os-ritual-intelligence__hero kxd-os-ritual-morning__hero">
          <p className="kxd-os-ritual-intelligence__greeting">{voice.greeting}</p>
          <p className="kxd-os-ritual-morning__welcome">{voice.welcome}</p>
          <p className="kxd-os-ritual-intelligence__meta">
            {briefing.dateDisplay} · {briefing.timeDisplay}
          </p>
          <h1 className="kxd-os-ritual-intelligence__headline">
            {intelligence.sections[0]?.paragraphs[0] ?? intelligence.postureLabel}
          </h1>
          <p className="kxd-os-ritual-intelligence__posture">
            Business posture: {intelligence.postureLabel}
          </p>
        </header>

        <MorningClientActivitySection activity={activity} />

        <MorningExecutiveSnapshotSection snapshot={snapshot} />

        <MorningFirstActionSection action={firstAction} />

        <div className="kxd-os-ritual-morning__narrative">
          <p className="kxd-os-ritual-morning__narrative-label">Executive Narrative</p>
          {intelligence.sections.map((section) => (
            <RitualIntelligenceSection key={section.id} block={section} subdued />
          ))}
        </div>

        <ExecutiveHealthSummary snapshot={briefing.healthSnapshot} variant="ritual" />

        <DelightMoment message={affirmation} context={isClear ? "morning-clear" : "morning-busy"} />
      </article>
    </RitualShell>
  );
}
