import { Suspense } from "react";
import { PortalLoginForm } from "@/components/portal/PortalLoginForm";
import { KxdLogo } from "@/components/ui/KxdLogo";

export default function PortalLoginPage() {
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
            Client Portal
          </p>
        </div>
        <h1
          className="mb-6 font-serif font-light"
          style={{ fontSize: "1.5rem", color: "var(--kxd-cream)", lineHeight: 1.2 }}
        >
          Sign in
        </h1>
        <Suspense fallback={null}>
          <PortalLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
