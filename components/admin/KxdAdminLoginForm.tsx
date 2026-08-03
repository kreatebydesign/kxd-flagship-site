"use client";

import { useAuth, useConfig } from "@payloadcms/ui";
import { formatAdminURL, getSafeRedirect } from "payload/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { OPERATIONS_HOME_PATH } from "@/lib/admin/constants";

type LoginSearchParams = {
  redirect?: string | string[];
};

function readRedirectParam(searchParams?: LoginSearchParams): string | undefined {
  const raw = searchParams?.redirect;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
  return undefined;
}

/**
 * Semantic KXD Admin login form.
 * Experience Refinement Phase 2 Batch B — Welcomed arrival language.
 * Native form + Payload `/api/users/login` — same session cookie path.
 */
export function KxdAdminLoginForm({
  searchParams,
}: {
  searchParams?: LoginSearchParams;
}) {
  const router = useRouter();
  const { setUser } = useAuth();
  const {
    config: {
      routes: { admin: adminRoute, api: apiRoute },
      admin: {
        routes: { forgot: forgotRoute },
        user: userSlug,
      },
    },
  } = useConfig();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  // Phase 7 Batch C — founder login lands on Today (sole home).
  const redirectTo = getSafeRedirect({
    fallbackTo: OPERATIONS_HOME_PATH,
    redirectTo: readRedirectParam(searchParams) ?? OPERATIONS_HOME_PATH,
  });

  const loginAction = formatAdminURL({
    apiRoute,
    path: `/${userSlug}/login`,
  });

  const forgotHref = formatAdminURL({
    adminRoute,
    path: forgotRoute,
  });

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (submittingRef.current || loading) return;

      const form = event.currentTarget;
      submittingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        // Allow password managers a brief beat to finish autofill before read.
        await new Promise((resolve) => setTimeout(resolve, 100));

        const formData = new FormData(form);
        const nextEmail = String(formData.get("email") ?? email).trim();
        const nextPassword = String(formData.get("password") ?? password);

        if (!nextEmail || !nextPassword) {
          setError("Email and password are needed to enter.");
          return;
        }

        const res = await fetch(loginAction, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            email: nextEmail,
            password: nextPassword,
          }),
        });

        const json = (await res.json().catch(() => ({}))) as {
          message?: string;
          errors?: Array<{ message?: string }>;
          user?: unknown;
          token?: string;
          exp?: number;
        };

        if (!res.ok) {
          const message =
            json.errors?.[0]?.message ||
            json.message ||
            "That email or password wasn’t recognized.";
          setError(message);
          return;
        }

        // Continuous handoff into Today — mark arrival for restrained transition.
        try {
          sessionStorage.setItem("kxd-arrival-transition", "1");
        } catch {
          // sessionStorage may be unavailable; ignore.
        }

        setUser(json as Parameters<typeof setUser>[0]);
        router.replace(redirectTo);
        router.refresh();
      } catch {
        setError("Unable to enter right now. Please try again.");
      } finally {
        submittingRef.current = false;
        setLoading(false);
      }
    },
    [email, password, loading, loginAction, redirectTo, router, setUser],
  );

  return (
    <form
      className="login__form kxd-admin-login__form"
      method="post"
      action={loginAction}
      onSubmit={handleSubmit}
      noValidate
      aria-label="Enter KXD OS"
    >
      {error ? (
        <p
          className="kxd-admin-login__error"
          role="alert"
          id="kxd-admin-login-error"
        >
          {error}
        </p>
      ) : null}

      <div className="login__form__inputWrap">
        <div className="field-type email">
          <label className="field-label" htmlFor="kxd-admin-login-email">
            Email
            <span className="required">*</span>
          </label>
          <input
            id="kxd-admin-login-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            disabled={loading}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-required="true"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "kxd-admin-login-error" : undefined}
          />
        </div>

        <div className="field-type password">
          <label className="field-label" htmlFor="kxd-admin-login-password">
            Password
            <span className="required">*</span>
          </label>
          <input
            id="kxd-admin-login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={loading}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-required="true"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "kxd-admin-login-error" : undefined}
          />
        </div>
      </div>

      <Link href={forgotHref} prefetch={false}>
        Forgot password?
      </Link>

      <div className="form-submit">
        <button
          type="submit"
          className="btn btn--style-primary btn--size-large"
          disabled={loading}
          aria-busy={loading || undefined}
        >
          {loading ? "Entering…" : "Enter"}
        </button>
      </div>
    </form>
  );
}
