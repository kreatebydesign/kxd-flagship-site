"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { ANALYTICS_EVENTS } from "@/lib/analytics/config";
import { trackPublicEvent } from "@/lib/analytics/track";

type TrackedLinkProps = ComponentProps<typeof Link> & {
  /** Stable placement id for reporting (e.g. header_desktop, hero_primary). */
  ctaLocation: string;
  /** Defaults from destination path when omitted. */
  eventName?: string;
  linkText?: string;
};

function hrefPath(href: ComponentProps<typeof Link>["href"]): string {
  if (typeof href === "string") return href.split("?")[0] ?? href;
  if (href && typeof href === "object" && "pathname" in href) {
    return String(href.pathname ?? "");
  }
  return "";
}

function defaultEventForPath(path: string): string {
  if (path.startsWith("/work")) return ANALYTICS_EVENTS.projectView;
  return ANALYTICS_EVENTS.contactClick;
}

export function TrackedLink({
  ctaLocation,
  eventName,
  linkText,
  href,
  onClick,
  children,
  ...rest
}: TrackedLinkProps) {
  const path = hrefPath(href);
  const event = eventName ?? defaultEventForPath(path);

  return (
    <Link
      href={href}
      onClick={(e) => {
        trackPublicEvent(event, {
          cta_location: ctaLocation,
          link_url: path || undefined,
          link_text: linkText,
        });
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}

type TrackedAnchorProps = ComponentProps<"a"> & {
  ctaLocation: string;
  eventName?: string;
  linkText?: string;
};

export function TrackedAnchor({
  ctaLocation,
  eventName = ANALYTICS_EVENTS.contactClick,
  linkText,
  href,
  onClick,
  children,
  ...rest
}: TrackedAnchorProps) {
  return (
    <a
      href={href}
      onClick={(e) => {
        trackPublicEvent(eventName, {
          cta_location: ctaLocation,
          link_url: typeof href === "string" ? href : undefined,
          link_text: linkText,
        });
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
