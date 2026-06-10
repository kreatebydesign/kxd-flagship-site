"use client";

import { useState } from "react";

const ASSET_CATEGORIES = [
  {
    category: "Brand Identity",
    items: [
      { id: "logo-vector", label: "Logo files — vector formats (.ai, .eps, .svg)" },
      { id: "logo-png", label: "Logo files — PNG with transparency" },
      { id: "brand-guidelines", label: "Brand guidelines document" },
      { id: "colors", label: "Brand colors — hex, RGB, or Pantone values" },
      { id: "typography", label: "Typography specifications or licensed fonts" },
    ],
  },
  {
    category: "Visual Assets",
    items: [
      { id: "photography", label: "Approved photography (product, team, environment)" },
      { id: "video", label: "Video content or B-roll footage" },
      { id: "icons", label: "Custom icons or illustration assets" },
      { id: "patterns", label: "Brand patterns or textures" },
    ],
  },
  {
    category: "Digital Access",
    items: [
      { id: "domain", label: "Domain registrar access or transfer authorization" },
      { id: "hosting", label: "Existing hosting account credentials" },
      { id: "analytics", label: "Google Analytics / Search Console access" },
      { id: "website-access", label: "Current website CMS admin access" },
      { id: "social", label: "Social media account access (as needed)" },
    ],
  },
  {
    category: "Content & Copy",
    items: [
      { id: "copywriting", label: "Existing copywriting or content drafts" },
      { id: "bio", label: "Team bios and headshots" },
      { id: "case-studies", label: "Client testimonials or case study materials" },
      { id: "legal", label: "Legal copy — privacy policy, terms of service" },
    ],
  },
] as const;

type AssetId = string;

export function AssetChecklist() {
  const allIds = ASSET_CATEGORIES.flatMap((c) => c.items.map((i) => i.id));
  const [checked, setChecked] = useState<Set<AssetId>>(new Set());

  function toggle(id: AssetId) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const total = allIds.length;
  const done = checked.size;
  const pct = Math.round((done / total) * 100);

  return (
    <div>
      {/* Progress indicator */}
      <div className="mb-8 flex items-center gap-5">
        <div
          style={{
            height: "2px",
            flex: 1,
            background: "rgba(255,255,255,0.06)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: `${pct}%`,
              background: "var(--kxd-gold)",
              transition: "width 300ms cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        </div>
        <p
          className="font-sans font-light shrink-0"
          style={{
            fontSize: "0.6875rem",
            letterSpacing: "0.08em",
            color: done === total ? "rgba(94,198,140,0.8)" : "rgba(255,255,255,0.3)",
          }}
        >
          {done} / {total} confirmed
        </p>
      </div>

      {/* Categories */}
      <div className="space-y-8">
        {ASSET_CATEGORIES.map((group) => (
          <div key={group.category}>
            <p
              className="mb-3 font-sans uppercase"
              style={{ fontSize: "0.5rem", letterSpacing: "0.14em", color: "rgba(255,255,255,0.3)" }}
            >
              {group.category}
            </p>
            <div
              style={{
                background: "var(--kxd-black-elevated)",
                border: "1px solid var(--kxd-border-white)",
              }}
            >
              {group.items.map((item, i) => {
                const isChecked = checked.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggle(item.id)}
                    className="flex w-full items-center gap-4 text-left transition-colors"
                    style={{
                      padding: "0.875rem 1.25rem",
                      borderBottom:
                        i < group.items.length - 1
                          ? "1px solid rgba(255,255,255,0.04)"
                          : "none",
                      background: isChecked ? "rgba(197,166,92,0.04)" : "transparent",
                    }}
                  >
                    {/* Checkbox */}
                    <div
                      className="flex h-5 w-5 shrink-0 items-center justify-center border transition-colors"
                      style={{
                        borderColor: isChecked ? "var(--kxd-gold)" : "rgba(255,255,255,0.12)",
                        background: isChecked ? "rgba(197,166,92,0.1)" : "transparent",
                      }}
                    >
                      {isChecked && (
                        <span style={{ color: "var(--kxd-gold)", fontSize: "0.5rem" }}>◆</span>
                      )}
                    </div>

                    <span
                      className="font-sans font-light"
                      style={{
                        fontSize: "0.9375rem",
                        color: isChecked ? "var(--kxd-cream)" : "var(--kxd-cream-muted)",
                        letterSpacing: "0.005em",
                        transition: "color 150ms",
                        textDecoration: isChecked ? "none" : "none",
                      }}
                    >
                      {item.label}
                    </span>

                    {isChecked && (
                      <span
                        className="ml-auto shrink-0 font-sans uppercase"
                        style={{ fontSize: "0.4375rem", letterSpacing: "0.12em", color: "rgba(94,198,140,0.6)" }}
                      >
                        Ready
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {done > 0 && (
        <div
          className="mt-8 flex items-center gap-4"
          style={{
            padding: "1rem 1.25rem",
            background: "rgba(197,166,92,0.04)",
            border: "1px solid var(--kxd-border-gold)",
          }}
        >
          <p
            className="font-serif font-light italic flex-1"
            style={{ fontSize: "0.9375rem", color: "var(--kxd-cream-soft)" }}
          >
            {done === total
              ? "All assets confirmed. KXD has everything needed to begin."
              : `${done} of ${total} assets confirmed. Gather the remaining items before your discovery call.`}
          </p>
        </div>
      )}
    </div>
  );
}
