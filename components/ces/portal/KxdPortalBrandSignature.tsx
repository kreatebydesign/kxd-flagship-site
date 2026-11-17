import {
  KXD_PORTAL_ATTRIBUTION_COMPANY,
  KXD_PORTAL_ATTRIBUTION_URL,
} from "@/lib/ces/portal/brand-signature";

/**
 * Discreet sidebar attribution for client portals — client brand remains dominant.
 */
export function KxdPortalBrandSignature() {
  return (
    <p className="kxd-portal-brand-signature">
      Designed &amp; Developed by{" "}
      <a href={KXD_PORTAL_ATTRIBUTION_URL} target="_blank" rel="noopener noreferrer">
        {KXD_PORTAL_ATTRIBUTION_COMPANY}
      </a>
    </p>
  );
}