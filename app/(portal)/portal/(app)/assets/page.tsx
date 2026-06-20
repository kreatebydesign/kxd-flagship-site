import { redirect } from "next/navigation";
import { getPortalAssets } from "@/lib/portal/data";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

function isImage(mime: string | null): boolean {
  return mime?.startsWith("image/") ?? false;
}

export default async function PortalAssetsPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const assets = await getPortalAssets(session);

  return (
    <div className="kxd-container py-10 lg:py-14">
      <div className="mb-8">
        <p className="kxd-eyebrow" style={{ opacity: 0.55 }}>Asset Vault</p>
        <h1 className="mt-2 font-serif font-light" style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)", color: "var(--kxd-cream)" }}>
          Your Assets
        </h1>
        <p className="mt-2 font-sans font-light" style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.35)" }}>
          Preview and download files shared with your account. Uploads are managed by KXD in MVP.
        </p>
      </div>

      {assets.length === 0 ? (
        <p className="font-sans" style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.3)" }}>
          No assets available yet. Your KXD team will add brand files as they are collected.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <div
              key={`${asset.category}-${asset.id}`}
              style={{ background: "var(--kxd-black-elevated)", border: "1px solid var(--kxd-border-white)" }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  aspectRatio: "16/10",
                  background: "rgba(255,255,255,0.02)",
                  borderBottom: "1px solid var(--kxd-border-white)",
                }}
              >
                {isImage(asset.mimeType) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.url}
                    alt={asset.alt}
                    className="max-h-full max-w-full object-contain p-4"
                  />
                ) : (
                  <span className="font-serif" style={{ fontSize: "2rem", color: "rgba(197,166,92,0.35)" }}>◈</span>
                )}
              </div>
              <div className="p-4">
                <p className="font-sans font-light truncate" style={{ fontSize: "0.875rem", color: "var(--kxd-cream)" }}>
                  {asset.title}
                </p>
                <p className="mt-1 font-sans uppercase" style={{ fontSize: "0.4375rem", letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)" }}>
                  {asset.category}
                </p>
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block font-sans uppercase"
                  style={{ fontSize: "0.5rem", letterSpacing: "0.14em", color: "var(--kxd-gold)", textDecoration: "none" }}
                >
                  Download →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
