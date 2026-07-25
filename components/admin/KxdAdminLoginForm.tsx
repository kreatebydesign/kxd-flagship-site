"use client";

import { useAuth, useConfig, useTranslation } from "@payloadcms/ui";
import { formatAdminURL, getSafeRedirect } from "payload/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

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
 * Native `<form onSubmit>` + `type="submit"` so Enter from email/password works
 * (including password-manager autofill). Uses Payload `/api/users/login` — same
 * session cookie path as the stock LoginForm.
 */
export function KxdAdminLoginForm({
  searchParams,
}: {
  searchParams?: LoginSearchParams;
}) {
  const router = useRouter();
  const { setUser } = useAuth();
  const { t } = useTranslation();
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

  const redirectTo = getSafeRedirect({
    fallbackTo: adminRoute,
    redirectTo: readRedirectParam(searchParams) ?? adminRoute,
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
          setError("Email and password are required.");
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
            "Invalid email or password.";
          setError(message);
          return;
        }

        // Same auth context handoff as Payload LoginForm onSuccess → setUser.
        setUser(json as Parameters<typeof setUser>[0]);
        router.replace(redirectTo);
        router.refresh();
      } catch {
        setError("Unable to sign in. Please try again.");
      } finally {
        submittingRef.current = false;
        setLoading(false);
      }
    },
    [email, password, loading, loginAction, redirectTo, router, setUser],
  );

  return (
    <form
      className="login__form"
      method="post"
      action={loginAction}
      onSubmit={handleSubmit}
      noValidate
    >
      {error ? (
        <p className="kxd-admin-login__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="login__form__inputWrap">
        <div className="field-type email">
          <label className="field-label" htmlFor="kxd-admin-login-email">
            {t("general:email")}
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
          />
        </div>

        <div className="field-type password">
          <label className="field-label" htmlFor="kxd-admin-login-password">
            {t("general:password")}
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
          />
        </div>
      </div>

      <Link href={forgotHref} prefetch={false}>
        {t("authentication:forgotPasswordQuestion")}
      </Link>

      <div className="form-submit">
        <button
          type="submit"
          className="btn btn--style-primary btn--size-large"
          disabled={loading}
          aria-busy={loading || undefined}
        >
          {loading ? "Signing in…" : t("authentication:login")}
        </button>
      </div>
    </form>
  );
}
