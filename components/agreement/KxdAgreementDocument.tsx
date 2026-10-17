import type { ReactNode } from "react";
import { KXD_AGREEMENT_LOGO_PUBLIC_PATH } from "@/lib/agreement-presentation/tokens";

export function KxdAgreementDocument(props: {
  children: ReactNode;
  variant?: "signing" | "workspace";
  showLogo?: boolean;
  eyebrow?: string;
  mastheadExtra?: ReactNode;
}) {
  const { children, variant = "signing", showLogo = true, eyebrow, mastheadExtra } = props;
  const rootClass =
    variant === "workspace"
      ? "kxd-agreement-doc kxd-agreement-doc--workspace"
      : "kxd-agreement-doc";

  return (
    <div className={rootClass}>
      {(showLogo || eyebrow || mastheadExtra) && (
        <header className="kxd-agreement-doc__masthead">
          {showLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={KXD_AGREEMENT_LOGO_PUBLIC_PATH}
              alt="Kreate by Design"
              width={72}
              height={68}
              className="kxd-agreement-doc__logo"
            />
          ) : null}
          {eyebrow ? <p className="kxd-agreement-doc__eyebrow">{eyebrow}</p> : null}
          {mastheadExtra}
        </header>
      )}
      <div className="kxd-agreement-doc__body">{children}</div>
    </div>
  );
}
