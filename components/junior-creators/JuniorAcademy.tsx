import { buildAcademyModuleViews, type AcademyModuleView } from "@/lib/junior-creators/academy";
import { KXD_OS as C } from "@/lib/kxd-os/palette";

type Props = {
  totalLeads: number;
};

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p
      style={{
        fontFamily: C.sans,
        fontSize: "0.6875rem",
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: C.creamSubtle,
        ...style,
      }}
    >
      {children}
    </p>
  );
}

const STATUS_STYLE: Record<
  AcademyModuleView["displayStatus"],
  { color: string; border: string }
> = {
  Unlocked: { color: C.goldDim, border: C.borderGold },
  "In Progress": { color: C.gold, border: C.borderGoldStrong },
  Locked: { color: "rgba(245,241,232,0.35)", border: C.border },
};

function ModuleCard({ module }: { module: AcademyModuleView }) {
  const isLocked = module.displayStatus === "Locked";
  const statusStyle = STATUS_STYLE[module.displayStatus];

  return (
    <article
      style={{
        background: C.glass,
        border: `1px solid ${isLocked ? C.border : C.border}`,
        borderLeft: module.displayStatus === "In Progress" ? `2px solid ${C.gold}` : undefined,
        padding: "1.375rem 1.5rem",
        opacity: isLocked ? 0.78 : 1,
        transition: "background 0.2s ease",
      }}
      className="kxd-academy-module"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          style={{
            fontFamily: C.sans,
            fontSize: "0.6875rem",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: statusStyle.color,
            border: `1px solid ${statusStyle.border}`,
            padding: "0.2rem 0.5rem",
          }}
        >
          {module.displayStatus}
        </span>
        <span
          style={{
            fontFamily: C.sans,
            fontSize: "0.6875rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: C.goldDim,
            border: `1px solid ${C.borderGold}`,
            padding: "0.2rem 0.5rem",
          }}
        >
          {module.track}
        </span>
        <span
          style={{
            fontFamily: C.sans,
            fontSize: "0.6875rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(245,241,232,0.38)",
          }}
        >
          {module.difficulty} · {module.estimatedTime}
        </span>
      </div>

      <h3
        style={{
          fontFamily: C.serif,
          fontWeight: 400,
          fontSize: "1.125rem",
          color: isLocked ? C.creamMuted : C.cream,
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

      {!isLocked && (
        <>
          <Label style={{ marginBottom: "0.625rem" }}>What you&apos;ll learn</Label>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {module.learnPoints.map((point) => (
              <li
                key={point}
                style={{
                  fontFamily: C.sans,
                  fontSize: "0.8125rem",
                  color: C.creamSubtle,
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
        </>
      )}
    </article>
  );
}

export function JuniorAcademy({ totalLeads }: Props) {
  const modules = buildAcademyModuleViews(totalLeads);

  return (
    <section className="mb-10">
      <div style={{ marginBottom: "1.5rem" }}>
        <Label style={{ color: C.goldDim, marginBottom: "0.75rem" }}>Skill Guides</Label>
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
          Deep dives as you level up.
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
          Guides unlock as you submit more discoveries — websites, branding, SEO, and how KXD works inside.
        </p>
      </div>

      <div
        className="grid gap-px sm:grid-cols-2"
        style={{
          background: C.border,
          border: `1px solid ${C.border}`,
        }}
      >
        {modules.map((module) => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </div>

      <style>{`
        .kxd-academy-module:hover {
          background: ${C.glassHover};
        }
      `}</style>
    </section>
  );
}
