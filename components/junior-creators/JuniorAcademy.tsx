import { ACADEMY_MODULES, type AcademyModule } from "@/lib/junior-creators/academy";

const C = {
  bgElevated: "#0B0B0B",
  bgCard: "#101010",
  gold: "#C9A962",
  goldDim: "rgba(201,169,98,0.55)",
  cream: "#F5F1E8",
  creamMuted: "rgba(245,241,232,0.72)",
  border: "rgba(255,255,255,0.08)",
  borderGold: "rgba(201,169,98,0.16)",
  serif: "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans: "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
} as const;

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p
      style={{
        fontFamily: C.sans,
        fontSize: "0.6875rem",
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.3)",
        ...style,
      }}
    >
      {children}
    </p>
  );
}

function ModuleCard({ module }: { module: AcademyModule }) {
  const isAvailable = module.status === "Available";

  return (
    <article
      style={{
        background: C.bgCard,
        border: `1px solid ${isAvailable ? C.borderGold : C.border}`,
        padding: "1.375rem 1.5rem",
      }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          style={{
            fontFamily: C.sans,
            fontSize: "0.6875rem",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: isAvailable ? C.goldDim : "rgba(255,255,255,0.35)",
            border: `1px solid ${isAvailable ? C.borderGold : C.border}`,
            padding: "0.2rem 0.5rem",
          }}
        >
          {module.status}
        </span>
        <span
          style={{
            fontFamily: C.sans,
            fontSize: "0.6875rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.28)",
          }}
        >
          {module.level} · {module.estimatedTime}
        </span>
      </div>

      <h3
        style={{
          fontFamily: C.serif,
          fontWeight: 400,
          fontSize: "1.125rem",
          color: isAvailable ? C.cream : C.creamMuted,
          lineHeight: 1.25,
          marginBottom: "0.5rem",
        }}
      >
        {module.title}
      </h3>
      <p
        style={{
          fontFamily: C.sans,
          fontSize: "0.8125rem",
          color: C.creamMuted,
          lineHeight: 1.55,
          marginBottom: "1rem",
        }}
      >
        {module.description}
      </p>

      <Label style={{ marginBottom: "0.625rem" }}>What you&apos;ll learn</Label>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {module.learnPoints.map((point) => (
          <li
            key={point}
            style={{
              fontFamily: C.sans,
              fontSize: "0.8125rem",
              color: "rgba(245,241,232,0.55)",
              lineHeight: 1.5,
              paddingLeft: "0.875rem",
              marginBottom: "0.35rem",
              borderLeft: `1px solid ${C.border}`,
            }}
          >
            {point}
          </li>
        ))}
      </ul>
    </article>
  );
}

export function JuniorAcademy() {
  return (
    <section className="mb-10">
      <div style={{ marginBottom: "1.5rem" }}>
        <Label style={{ color: C.goldDim, marginBottom: "0.75rem" }}>KXD Academy</Label>
        <h2
          style={{
            fontFamily: C.serif,
            fontWeight: 300,
            fontSize: "clamp(1.5rem, 3.5vw, 2rem)",
            color: C.cream,
            lineHeight: 1.1,
            maxWidth: "32rem",
          }}
        >
          Build your creative foundation.
        </h2>
        <p
          style={{
            fontFamily: C.sans,
            fontSize: "0.8125rem",
            color: C.creamMuted,
            marginTop: "0.75rem",
            maxWidth: "40rem",
            lineHeight: 1.65,
          }}
        >
          Learn how KXD finds strong opportunities, train your eye for premium work, and grow into
          higher-level studio responsibilities — one module at a time.
        </p>
      </div>

      <div
        className="grid gap-px sm:grid-cols-2"
        style={{
          background: C.border,
          border: `1px solid ${C.border}`,
        }}
      >
        {ACADEMY_MODULES.map((module) => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </div>
    </section>
  );
}
