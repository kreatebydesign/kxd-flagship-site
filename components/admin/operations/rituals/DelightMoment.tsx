import type { DelightContext } from "@/lib/rituals";

export function DelightMoment({
  message,
  context,
}: {
  message: string;
  context?: DelightContext;
}) {
  return (
    <p
      className={`kxd-os-ritual__delight${context ? ` kxd-os-ritual__delight--${context}` : ""}`}
      role="note"
    >
      {message}
    </p>
  );
}
