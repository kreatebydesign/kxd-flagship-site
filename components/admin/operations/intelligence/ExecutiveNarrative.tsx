import type { ExecutiveNarrative } from "@/lib/intelligence/briefings";
import type { IntelligenceConfidence } from "@/lib/intelligence/types";

function confidenceLabel(confidence: IntelligenceConfidence): string {
  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

export interface ExecutiveNarrativeProps {
  narrative: ExecutiveNarrative;
  greeting: string;
  dateDisplay: string;
  timeDisplay: string;
  confidence: IntelligenceConfidence;
  variant?: "default" | "ritual";
}

export function ExecutiveNarrativeBlock({
  narrative,
  greeting,
  dateDisplay,
  timeDisplay,
  confidence,
  variant = "default",
}: ExecutiveNarrativeProps) {
  const isRitual = variant === "ritual";

  return (
    <header className={`kxd-os-intelligence-hero${isRitual ? " kxd-os-intelligence-hero--ritual" : ""}`}>
      <div className="kxd-os-intelligence-hero__meta">
        <p className="kxd-os-intelligence-hero__eyebrow">
          {isRitual ? "Morning Brief" : "Executive Briefing"}
        </p>
        <p className="kxd-os-intelligence-hero__datetime">
          {greeting} · {dateDisplay}
          {!isRitual ? ` · ${timeDisplay}` : ""}
        </p>
      </div>
      <p className="kxd-os-intelligence-hero__narrative">{narrative.text}</p>
      {!isRitual ? (
        <p className="kxd-os-intelligence-hero__confidence">
          Intelligence confidence · {confidenceLabel(confidence)}
        </p>
      ) : null}
    </header>
  );
}
