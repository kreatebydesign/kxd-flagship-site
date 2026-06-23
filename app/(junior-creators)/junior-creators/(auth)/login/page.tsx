import { Suspense } from "react";
import { KxdLogo } from "@/components/ui/KxdLogo";
import { JuniorLoginForm } from "@/components/junior-creators/JuniorLoginForm";

export default function JuniorCreatorsLoginPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ background: "var(--kxd-black-base)" }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "24rem",
          background: "var(--kxd-black-elevated)",
          border: "1px solid var(--kxd-border-white)",
          padding: "2rem 2rem 2.25rem",
        }}
      >
        <div className="mb-8 flex flex-col items-center gap-3">
          <KxdLogo />
          <p
            className="font-sans uppercase"
            style={{ fontSize: "0.5rem", letterSpacing: "0.16em", color: "rgba(255,255,255,0.35)" }}
          >
            KXD Academy · Junior Creators
          </p>
        </div>
        <h1
          className="mb-2 font-serif font-light"
          style={{ fontSize: "1.5rem", color: "var(--kxd-cream)", lineHeight: 1.2 }}
        >
          Junior Creators
        </h1>
        <p className="mb-6 font-sans" style={{ fontSize: "0.5625rem", color: "rgba(245,241,232,0.48)" }}>
          Sign in to your KXD Academy research desk.
        </p>
        <Suspense fallback={null}>
          <JuniorLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
