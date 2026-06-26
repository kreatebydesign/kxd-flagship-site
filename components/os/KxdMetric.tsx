import { kxdOsCn } from "./utils";

export function KxdMetric({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={kxdOsCn("kxd-os-card", className)}>
      <p className="kxd-os-metric__label">{label}</p>
      <p className="kxd-os-metric__value">{value}</p>
      {sub && <p className="kxd-os-metric__sub">{sub}</p>}
    </div>
  );
}
