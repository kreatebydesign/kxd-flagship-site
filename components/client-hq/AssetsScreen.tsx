import { KxdEmptyState, KxdPage } from "@/components/os";
import { ClientHqPageHero } from "./ClientHqPageHero";
import type { PortalMediaAsset } from "@/lib/portal/data";

const ASSET_GROUPS = [
  "Logo",
  "Brand Guidelines",
  "Marketing",
  "Photos",
  "Videos",
  "Brand Asset",
  "Documents",
  "Deliverables",
];

function isKnownCategory(category: string): boolean {
  return ASSET_GROUPS.includes(category);
}

function isImage(mime: string | null): boolean {
  return mime?.startsWith("image/") ?? false;
}

export function AssetsScreen({ assets }: { assets: PortalMediaAsset[] }) {
  const grouped = ASSET_GROUPS.map((category) => ({
    category,
    items: assets.filter((a) => a.category === category),
  })).filter((g) => g.items.length > 0);

  const uncategorized = assets.filter((a) => !isKnownCategory(a.category));

  if (uncategorized.length > 0) {
    grouped.push({ category: "Other", items: uncategorized });
  }

  return (
    <KxdPage className="kxd-os-page--ops">
      <ClientHqPageHero
        eyebrow="Library"
        title="Assets"
        lead="Brand files, logos, photography, documents, and deliverables — organized in one place."
      />

      {assets.length === 0 ? (
        <KxdEmptyState
          title="No assets yet"
          description="Your KXD team will add brand files and deliverables as they are collected."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
          {grouped.map((group) => (
            <section key={group.category}>
              <p className="kxd-os-section__label">{group.category}</p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(14rem, 1fr))",
                  gap: "1rem",
                }}
              >
                {group.items.map((asset) => (
                  <article key={`${asset.category}-${asset.id}`} className="kxd-os-card">
                    <div
                      style={{
                        aspectRatio: "16/10",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "1rem",
                        background: "var(--kxd-os-bg-muted)",
                        borderRadius: "var(--kxd-os-radius-sm)",
                      }}
                    >
                      {isImage(asset.mimeType) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={asset.url}
                          alt={asset.alt}
                          style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", padding: "1rem" }}
                        />
                      ) : (
                        <span className="kxd-os-meta">File</span>
                      )}
                    </div>
                    <p className="kxd-os-card__title">{asset.title}</p>
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="kxd-os-meta"
                      style={{ display: "inline-block", marginTop: "0.75rem", textDecoration: "none" }}
                    >
                      Download
                    </a>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </KxdPage>
  );
}
