import type { ActiveEngagementSnapshot } from "@/lib/portal/active-engagement";

export function ActiveEngagementCard({
  engagement,
  eyebrow = "Active engagement",
  title = "Your support",
}: {
  engagement: ActiveEngagementSnapshot | null | undefined;
  eyebrow?: string;
  title?: string;
}) {
  if (!engagement?.available) return null;

  const facts: Array<{ label: string; value: string }> = [];
  if (engagement.statusLabel) {
    facts.push({ label: "Status", value: engagement.statusLabel });
  }
  if (engagement.periodLabel) {
    facts.push({ label: "Service period", value: engagement.periodLabel });
  }
  if (engagement.paymentLabel) {
    facts.push({ label: "Payment", value: engagement.paymentLabel });
  }
  if (engagement.capacityLabel) {
    facts.push({ label: "Monthly capacity", value: engagement.capacityLabel });
  }

  if (!engagement.title && facts.length === 0 && !engagement.includedSummary) {
    return null;
  }

  return (
    <section
      className="kxd-active-engagement"
      aria-labelledby="active-engagement-title"
    >
      <p className="kxd-active-engagement__eyebrow">{eyebrow}</p>
      <h2 id="active-engagement-title" className="kxd-active-engagement__title">
        {engagement.title || title}
      </h2>
      {facts.length > 0 ? (
        <dl className="kxd-active-engagement__facts">
          {facts.map((fact) => (
            <div key={fact.label} className="kxd-active-engagement__fact">
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {engagement.includedSummary ? (
        <p className="kxd-active-engagement__included">{engagement.includedSummary}</p>
      ) : null}
    </section>
  );
}
