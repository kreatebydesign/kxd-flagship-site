import { OpsStatusBadge } from "@/components/admin/operations/shared/OpsBriefing";
import type { ExecutiveHealthSnapshot } from "@/lib/intelligence/briefings";

function healthVariant(level: string): "success" | "default" | "warning" | "critical" {
  if (level === "excellent" || level === "strong" || level === "smooth") return "success";
  if (level === "healthy" || level === "stable" || level === "busy") return "default";
  if (level === "needs-attention" || level === "cooling" || level === "strained") return "warning";
  return "critical";
}

function HealthCell({
  label,
  level,
  score,
  displayLabel,
  emphasis = false,
}: {
  label: string;
  level: string;
  score: number;
  displayLabel: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`kxd-os-intelligence-health-cell${emphasis ? " kxd-os-intelligence-health-cell--overall" : ""}`}
    >
      <p className="kxd-os-intelligence-health-cell__label">{label}</p>
      <div className="kxd-os-intelligence-health-cell__value">
        <span className="kxd-os-intelligence-health-cell__level">{displayLabel}</span>
        <OpsStatusBadge label={String(score)} variant={healthVariant(level)} />
      </div>
    </div>
  );
}

export function ExecutiveHealthSummary({
  snapshot,
  variant = "default",
}: {
  snapshot: ExecutiveHealthSnapshot;
  variant?: "default" | "ritual";
}) {
  const isRitual = variant === "ritual";

  return (
    <section
      className={`kxd-os-intelligence-health${isRitual ? " kxd-os-intelligence-health--ritual" : ""}`}
      aria-label="Executive health summary"
    >
      <HealthCell
        label={isRitual ? "Business" : "Business Health"}
        level={snapshot.business.level}
        score={snapshot.business.score}
        displayLabel={snapshot.business.label}
      />
      <HealthCell
        label={isRitual ? "Relationships" : "Relationship Health"}
        level={snapshot.relationship.level}
        score={snapshot.relationship.score}
        displayLabel={snapshot.relationship.label}
      />
      <HealthCell
        label={isRitual ? "Operations" : "Operational Health"}
        level={snapshot.operational.level}
        score={snapshot.operational.score}
        displayLabel={snapshot.operational.label}
      />
      {!isRitual ? (
        <HealthCell
          label="Overall Intelligence"
          level={snapshot.overall.level}
          score={snapshot.overall.score}
          displayLabel={snapshot.overall.label}
          emphasis
        />
      ) : null}
    </section>
  );
}
