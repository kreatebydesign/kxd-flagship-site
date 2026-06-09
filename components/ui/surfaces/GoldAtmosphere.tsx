type GoldAtmosphereProps = {
  position?: "top" | "center";
  intensity?: "subtle" | "hero";
};

export function GoldAtmosphere({
  position = "top",
  intensity = "subtle",
}: GoldAtmosphereProps) {
  return (
    <div
      aria-hidden
      className={
        intensity === "hero" ? "kxd-gold-atmosphere-hero" : "kxd-gold-atmosphere"
      }
      data-position={position}
    />
  );
}
