import Link from "next/link";
import { KxdOsLogo } from "@/components/os";
import {
  getClientLauncherCards,
  getLauncherCardsForUser,
  getStudioLauncherCards,
  type LauncherCard,
} from "@/lib/kxd-os/launcher-cards";
import { KXD_OS as C, KXD_OS_CARD, KXD_OS_CARD_HOVER } from "@/lib/kxd-os/palette";

export const dynamic = "force-dynamic";

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

function LauncherCardLink({ card }: { card: LauncherCard }) {
  return (
    <Link
      href={card.href}
      className="kxd-os-launcher-card"
      style={{
        display: "block",
        textDecoration: "none",
        background: C.glass,
        border: KXD_OS_CARD.border,
        padding: "1.375rem 1.5rem",
        transition: "background 0.2s ease, border-color 0.2s ease",
      }}
    >
      <p
        style={{
          fontFamily: C.sans,
          fontSize: "0.6875rem",
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
          fontSize: "0.8125rem",
          color: C.creamMuted,
          lineHeight: 1.55,
        }}
      >
        {card.description}
      </p>
      <p
        style={{
          fontFamily: C.sans,
          fontSize: "0.6875rem",
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
  const visibleCards = getLauncherCardsForUser();
  const studioCards = getStudioLauncherCards(visibleCards);
  const clientCards = getClientLauncherCards(visibleCards);

  return (
    <div style={{ background: C.bgBase, minHeight: "100vh", fontFamily: C.sans }}>
      <header
        style={{
          background: C.bgPure,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div
          className="mx-auto flex max-w-screen-xl items-center justify-between gap-4"
          style={{ padding: "1.25rem 1.5rem" }}
        >
          <div className="flex items-center gap-4">
            <KxdOsLogo />
            <div>
              <p
                style={{
                  fontFamily: C.sans,
                  fontSize: "0.8125rem",
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
                  fontSize: "0.6875rem",
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
              fontSize: "0.8125rem",
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
            {studioCards.map((card) => (
              <LauncherCardLink key={card.id} card={card} />
            ))}
          </div>
        </section>

        {clientCards.length > 0 && (
          <section style={{ marginTop: "2.5rem" }}>
            <Label style={{ color: C.goldDim, marginBottom: "1rem" }}>Client Infrastructure</Label>
            <div
              className="grid gap-px"
              style={{
                background: C.border,
                border: `1px solid ${C.border}`,
              }}
            >
              {clientCards.map((card) => (
                <LauncherCardLink key={card.id} card={card} />
              ))}
            </div>
          </section>
        )}

        <p
          style={{
            fontFamily: C.sans,
            fontSize: "0.8125rem",
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
          background: ${KXD_OS_CARD_HOVER.background};
          border-color: ${KXD_OS_CARD_HOVER.borderColor};
        }
      `}</style>
    </div>
  );
}
