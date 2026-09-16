"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import type { ComponentProps, MouseEvent, ReactNode } from "react";

function NavPendingAck() {
  const { pending } = useLinkStatus();
  return pending ? <span className="kxd-os-nav-ack" aria-hidden="true" /> : null;
}

type OperatorNavLinkProps = Omit<ComponentProps<typeof Link>, "prefetch"> & {
  children: ReactNode;
  /**
   * Same-document query navigation. Return true to prevent a full RSC refetch
   * when the destination is already in memory.
   */
  onSoftNavigate?: (href: string) => boolean;
};

export function OperatorNavLink({
  children,
  className,
  onSoftNavigate,
  onClick,
  href,
  ...rest
}: OperatorNavLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    if (!onSoftNavigate) return;
    const nextHref = typeof href === "string" ? href : String(href);
    if (onSoftNavigate(nextHref)) {
      event.preventDefault();
    }
  };

  return (
    <Link href={href} className={className} onClick={handleClick} prefetch {...rest}>
      <NavPendingAck />
      {children}
    </Link>
  );
}
