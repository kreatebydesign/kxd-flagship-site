export function CommercialStatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "positive" | "warning" | "muted";
}) {
  return (
    <span className={`kxd-os-commercial-badge kxd-os-commercial-badge--${tone}`}>
      {label}
    </span>
  );
}

export function statusTone(status: string): "neutral" | "positive" | "warning" | "muted" {
  const s = status.toLowerCase();
  if (/(active|paid|accepted|executed|signed)/.test(s)) return "positive";
  if (/(pending|sent|finalized|draft|awaiting)/.test(s)) return "warning";
  if (/(cancelled|void|none)/.test(s)) return "muted";
  return "neutral";
}
