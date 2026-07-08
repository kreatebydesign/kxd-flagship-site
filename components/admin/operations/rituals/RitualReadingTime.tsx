export function RitualReadingTime({ label }: { label: string }) {
  return (
    <p className="kxd-os-ritual__reading-time" aria-label={`Estimated reading time: ${label}`}>
      {label}
    </p>
  );
}
