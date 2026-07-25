import type { HTMLAttributes, ReactNode } from "react";
import { kxdOsCn } from "./utils";

/**
 * Trust / attribution states for KXD Intelligence surfaces.
 * Related visually, but each state must remain unmistakable.
 */
export type KxdIntelligenceSource =
  | "none"
  | "deterministic"
  | "ai-assisted"
  | "matt"
  | "answered"
  | "escalation"
  | "unable"
  | "unavailable";

/** Surface density variants — do not force a full rail everywhere. */
export type KxdIntelligenceVariant = "feature" | "context" | "callout" | "source";

const SOURCE_LABEL: Record<KxdIntelligenceSource, string> = {
  none: "KXD Intelligence",
  deterministic: "KXD Intelligence",
  "ai-assisted": "AI-assisted",
  matt: "Matt",
  answered: "KXD Intelligence",
  escalation: "Requires Matt",
  unable: "Unable to answer safely",
  unavailable: "Intelligence unavailable",
};

function sourceBadgeClass(source: KxdIntelligenceSource): string {
  switch (source) {
    case "escalation":
      return "kxd-os-intel-badge--escalation";
    case "answered":
    case "deterministic":
      return "kxd-os-intel-badge--answered";
    case "matt":
      return "kxd-os-intel-badge--matt";
    case "ai-assisted":
      return "kxd-os-intel-badge--assisted";
    case "unable":
      return "kxd-os-intel-badge--unable";
    case "unavailable":
      return "kxd-os-intel-badge--unavailable";
    default:
      return "";
  }
}

function resolveSource(
  source: KxdIntelligenceSource,
  requiresMatt: boolean,
): KxdIntelligenceSource {
  if (requiresMatt) return "escalation";
  if (source === "deterministic") return "answered";
  return source;
}

export function KxdIntelligenceMark({
  className,
  children = "KXD Intelligence",
}: {
  className?: string;
  children?: ReactNode;
}) {
  return <p className={kxdOsCn("kxd-os-intel-mark", className)}>{children}</p>;
}

export function KxdIntelligenceBadge({
  source = "none",
  requiresMatt = false,
  className,
  children,
}: {
  source?: KxdIntelligenceSource;
  requiresMatt?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const resolved = resolveSource(source, requiresMatt);

  return (
    <span className={kxdOsCn("kxd-os-intel-badge", sourceBadgeClass(resolved), className)}>
      {children ?? SOURCE_LABEL[resolved]}
    </span>
  );
}

export function KxdIntelligencePanel({
  title,
  description,
  context,
  primaryAction,
  secondaryActions,
  footer,
  children,
  className,
  variant = "feature",
  as: Tag = "aside",
  ...props
}: {
  title: string;
  description?: string;
  context?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** feature = full workspace rail; context = tied to active work */
  variant?: Extract<KxdIntelligenceVariant, "feature" | "context">;
  as?: "aside" | "section" | "div";
} & HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={kxdOsCn(
        "kxd-os-intel-panel",
        "kxd-os-ops-card-padding",
        variant === "context" && "kxd-os-intel-panel--context",
        className,
      )}
      aria-label={props["aria-label"] ?? "KXD Intelligence"}
      {...props}
    >
      <header className="kxd-os-intel-panel__header">
        <KxdIntelligenceMark />
        <h2 className="kxd-os-intel-panel__title">{title}</h2>
        {description ? <p className="kxd-os-intel-panel__desc">{description}</p> : null}
        {context ? <div className="kxd-os-intel-panel__context">{context}</div> : null}
      </header>

      {children ? <div className="kxd-os-intel-panel__body">{children}</div> : null}

      {primaryAction || secondaryActions ? (
        <div className="kxd-os-intel-panel__actions">
          {primaryAction}
          {secondaryActions}
        </div>
      ) : null}

      {footer ? <div className="kxd-os-intel-panel__footer">{footer}</div> : null}
    </Tag>
  );
}

export function KxdIntelligenceCallout({
  title,
  description,
  action,
  children,
  className,
  inset = false,
  variant = "callout",
  showMark = true,
  ...props
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Nested inside a full Intelligence panel — quieter surface. */
  inset?: boolean;
  variant?: Extract<KxdIntelligenceVariant, "callout" | "context">;
  showMark?: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={kxdOsCn(
        "kxd-os-intel-callout",
        "kxd-os-ops-card-padding",
        inset && "kxd-os-intel-callout--inset",
        variant === "context" && "kxd-os-intel-callout--context",
        className,
      )}
      {...props}
    >
      <div className="kxd-os-intel-ask__head">
        <div className="kxd-os-intel-ask__copy">
          {showMark ? <KxdIntelligenceMark /> : null}
          <h3 className="kxd-os-intel-callout__title">{title}</h3>
          {description ? <p className="kxd-os-intel-callout__desc">{description}</p> : null}
        </div>
        {action ? <div className="kxd-os-intel-ask__action-wrap">{action}</div> : null}
      </div>
      {children ? <div className="kxd-os-intel-callout__body">{children}</div> : null}
    </div>
  );
}

export function KxdIntelligenceResponse({
  source = "deterministic",
  requiresMatt = false,
  children,
  className,
  note,
}: {
  source?: KxdIntelligenceSource;
  requiresMatt?: boolean;
  children: ReactNode;
  className?: string;
  note?: ReactNode;
}) {
  const resolved = resolveSource(source, requiresMatt);

  return (
    <div
      className={kxdOsCn(
        "kxd-os-intel-response",
        resolved === "escalation" && "kxd-os-intel-response--escalation",
        (resolved === "answered" || resolved === "deterministic") &&
          "kxd-os-intel-response--answered",
        resolved === "unable" && "kxd-os-intel-response--unable",
        resolved === "unavailable" && "kxd-os-intel-response--unavailable",
        className,
      )}
      role="status"
    >
      <div className="kxd-os-intel-response__meta">
        <KxdIntelligenceMark />
        <KxdIntelligenceBadge source={source} requiresMatt={requiresMatt} />
      </div>
      <div className="kxd-os-intel-response__body">{children}</div>
      {note ? <p className="kxd-os-intel-response__note">{note}</p> : null}
    </div>
  );
}

/** Compact attribution chip — `source` surface variant. */
export function KxdIntelligenceAttribution({
  source = "none",
  requiresMatt = false,
  className,
  children,
}: {
  source?: KxdIntelligenceSource;
  requiresMatt?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <KxdIntelligenceBadge
      source={source}
      requiresMatt={requiresMatt}
      className={kxdOsCn("kxd-os-intel-source", className)}
    >
      {children}
    </KxdIntelligenceBadge>
  );
}
