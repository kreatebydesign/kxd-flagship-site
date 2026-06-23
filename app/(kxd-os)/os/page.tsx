import Link from "next/link";
import { KxdLogo } from "@/components/ui/KxdLogo";
import { KXD_OS as C } from "@/lib/kxd-os/palette";

type LauncherCard = {
  title: string;
  description: string;
  href: string;
  tag: string;
};

const LAUNCHER_CARDS: LauncherCard[] = [
  {
    title: "Executive Overview",
    description: "Studio-wide snapshot — clients, delivery pipeline, onboarding, and growth metrics.",
    href: "/admin/operations/executive",
    tag: "Executive",
  },
  {
    title: "Research Desk",
    description: "Lead research intake, qualification queue, and opportunity tracking.",
    href: "/admin/operations/research",
    tag: "Growth infrastructure",
  },
  {
    title: "Junior Creators",
    description: "KXD Academy research desk — shifts, pipeline progress, and lead submissions.",
    href: "/junior-creators",
    tag: "KXD Academy",
  },
  {
    title: "Client Onboarding",
    description: "New client readiness, intake workflows, and launch preparation.",
    href: "/admin/operations/onboarding",
    tag: "Client infrastructure",
  },
  {
    title: "Creative Operations",
    description: "Campaigns, brand kits, social, flyers, and creative production systems.",
    href: "/admin/operations/creative",
    tag: "Studio systems",
  },
  {
    title: "Website Audits",
    description: "Public audit submissions, scores, grades, and sales follow-up pipeline.",
    href: "/admin/operations/audits",
    tag: "Growth infrastructure",
  },
  {
    title: "Playbooks",
    description: "Internal SOP library — launch protocols, DNS, analytics, and client success.",
    href: "/admin/operations/playbooks",
    tag: "Studio systems",
  },
  {
    title: "Payload Admin",
    description: "Full CMS — collections, records, media, and system configuration.",
    href: "/admin",
    tag: "Platform",
  },
];

const OPTIONAL_CARD: LauncherCard = {
  title: "Client Portal",
  description: "Client-facing workspace for projects, requests, deliverables, and assets.",
  href: "/portal",
  tag: "Client infrastructure",
};

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p
      style={{
        fontFamily: C.sans,
        fontSize: "0.4375rem",
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

function LauncherCardLink({ card }: { card: LauncherCard }) {
  return (
    <Link
      href={card.href}
      className="kxd-os-launcher-card"
      style={{
        display: "block",
        textDecoration: "none",
        background: C.bgCard,
        border: `1px solid ${C.border}`,
        padding: "1.375rem 1.5rem",
      }}
    >
      <p
        style={{
          fontFamily: C.sans,
          fontSize: "0.375rem",
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: C.goldDim,
          marginBottom: "0.75rem",
        }}
      >
        {card.tag}
      </p>
      <h2
        style={{
          fontFamily: C.serif,
          fontWeight: 400,
          fontSize: "1.25rem",
          color: C.cream,
          lineHeight: 1.2,
          marginBottom: "0.5rem",
        }}
      >
        {card.title}
      </h2>
      <p
        style={{
          fontFamily: C.sans,
          fontSize: "0.5625rem",
          color: C.creamMuted,
          lineHeight: 1.55,
        }}
      >
        {card.description}
      </p>
      <p
        style={{
          fontFamily: C.sans,
          fontSize: "0.4375rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: C.goldDim,
          marginTop: "1rem",
        }}
      >
        Open →
      </p>
    </Link>
  );
}

export default function OsLauncherPage() {
  return (
    <div style={{ background: C.bgBase, minHeight: "100vh", fontFamily: C.sans }}>
      <header
        style={{
          background: C.bgPure,
          borderBottom: "1px solid rgba(201,169,98,0.14)",
        }}
      >
        <div
          className="mx-auto flex max-w-screen-xl items-center justify-between gap-4"
          style={{ padding: "1.25rem 1.5rem" }}
        >
          <div className="flex items-center gap-4">
            <KxdLogo />
            <div>
              <p
                style={{
                  fontFamily: C.sans,
                  fontSize: "0.5rem",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: C.creamMuted,
                }}
              >
                KXD OS
              </p>
              <p
                style={{
                  fontFamily: C.sans,
                  fontSize: "0.4375rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: C.creamSubtle,
                  marginTop: "0.35rem",
                }}
              >
                Creative Operations Platform
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl" style={{ padding: "2.5rem 1.5rem 5rem" }}>
        <div
          style={{
            marginBottom: "2.5rem",
            paddingBottom: "2rem",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <Label style={{ color: C.goldDim, marginBottom: "0.875rem" }}>Studio Launcher</Label>
          <h1
            style={{
              fontFamily: C.serif,
              fontWeight: 300,
              fontSize: "clamp(1.875rem, 5vw, 3rem)",
              color: C.cream,
              lineHeight: 1.05,
              maxWidth: "36rem",
            }}
          >
            One place for everything KXD runs on.
          </h1>
          <p
            style={{
              fontFamily: C.sans,
              fontSize: "0.625rem",
              color: C.creamMuted,
              marginTop: "1rem",
              maxWidth: "40rem",
              lineHeight: 1.65,
            }}
          >
            KXD OS brings the agency&apos;s research, client operations, creative systems, and internal
            growth tools into one place.
          </p>
        </div>

        <section>
          <Label style={{ color: C.goldDim, marginBottom: "1rem" }}>Studio Systems</Label>
          <div
            className="grid gap-px sm:grid-cols-2 lg:grid-cols-3"
            style={{
              background: C.border,
              border: `1px solid ${C.border}`,
            }}
          >
            {LAUNCHER_CARDS.map((card) => (
              <LauncherCardLink key={card.href} card={card} />
            ))}
          </div>
        </section>

        <section style={{ marginTop: "2.5rem" }}>
          <Label style={{ color: C.goldDim, marginBottom: "1rem" }}>Client Infrastructure</Label>
          <div style={{ border: `1px solid ${C.border}` }}>
            <LauncherCardLink card={OPTIONAL_CARD} />
          </div>
        </section>

        <p
          style={{
            fontFamily: C.sans,
            fontSize: "0.5rem",
            color: "rgba(245,241,232,0.36)",
            marginTop: "2.5rem",
            letterSpacing: "0.04em",
          }}
        >
          KXD OS · Creative Operations Platform · Internal use only
        </p>
      </main>

      <style>{`
        .kxd-os-launcher-card:hover {
          border-color: rgba(201,169,98,0.14);
        }
      `}</style>
    </div>
  );
}
