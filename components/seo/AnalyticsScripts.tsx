import { headers } from "next/headers";
import Script from "next/script";
import {
  getPublicGoogleTagId,
  isPublicProductionAnalyticsHost,
  resolveRequestHostname,
} from "@/lib/analytics/config";

/**
 * Public marketing site analytics only (`app/(site)/layout.tsx`).
 *
 * - Canonical Google tag: GT-TQTSJHVJ (connected GA4: G-1L1BXNJB4T)
 * - Loads only on kreatebydesign.com / www.kreatebydesign.com
 * - Not mounted on portal, admin, KXD OS, API, or auth layouts
 * - Does not install GTM (avoids duplicate Google tags)
 * - Initial page_view comes from gtag('config') — do not emit manual page_view events
 * - SPA navigations: rely on GA4 Enhanced Measurement
 *   (“Page changes based on browser history events”) — confirm in GA4 after deploy
 */
export async function AnalyticsScripts() {
  const headerStore = await headers();
  const hostname = resolveRequestHostname(headerStore);

  if (!isPublicProductionAnalyticsHost(hostname)) {
    return null;
  }

  const tagId = getPublicGoogleTagId();
  if (!tagId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${tagId}`}
        strategy="afterInteractive"
      />
      <Script id="google-tag-init" strategy="afterInteractive">
        {`(function(){
  var host = window.location.hostname;
  if (host !== 'kreatebydesign.com' && host !== 'www.kreatebydesign.com') return;
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', '${tagId}');
})();`}
      </Script>
    </>
  );
}
