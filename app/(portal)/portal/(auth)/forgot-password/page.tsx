import { Suspense } from "react";
import { PortalForgotPasswordForm } from "@/components/portal/PortalForgotPasswordForm";
import { KxdLogo } from "@/components/ui/KxdLogo";

export default function PortalForgotPasswordPage() {
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
        </div>
        <h1
          className="mb-2 font-serif font-light"
          style={{ fontSize: "1.5rem", color: "var(--kxd-cream)" }}
        >
          Reset password
        </h1>
        <p
          className="mb-6 font-sans font-light"
          style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.35)" }}
        >
          Enter your email and we&apos;ll send a reset link.
        </p>
        <Suspense fallback={null}>
          <PortalForgotPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
