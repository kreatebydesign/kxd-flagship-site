import { signatureStorageKey } from "@/lib/ces/portal/signature-session";
import { KXD_SIGNATURE_CANVAS } from "@/lib/ces/portal/brand-signature";

/**
 * Blocking inline script — hides dashboard chrome before first paint when intro will play.
 * Rendered from portal (app) layout only (all CES client dashboards).
 */
export function KxdSignatureArmingInline({
  clientId,
  enabled,
}: {
  clientId: number;
  enabled: boolean;
}) {
  if (!enabled || clientId <= 0) return null;

  const key = signatureStorageKey(clientId);
  const canvas = KXD_SIGNATURE_CANVAS;

  const script = `(function(){
    try {
      var k=${JSON.stringify(key)};
      var canvas=${JSON.stringify(canvas)};
      if (sessionStorage.getItem(k)) {
        document.documentElement.setAttribute("data-kxd-signature","idle");
        return;
      }
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        sessionStorage.setItem(k,"1");
        document.documentElement.setAttribute("data-kxd-signature","idle");
        return;
      }
      document.documentElement.setAttribute("data-kxd-signature","arming");
      document.documentElement.style.backgroundColor=canvas;
    } catch (e) {
      document.documentElement.setAttribute("data-kxd-signature","idle");
    }
  })();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} suppressHydrationWarning />;
}