"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { KxdButton } from "@/components/os";

type SourceType = "inquiry" | "project_inquiry" | "website_audit";

export function PromoteToSalesButton({
  sourceType,
  sourceId,
  alreadyPromoted,
  salesLeadId,
  disabled,
}: {
  sourceType: SourceType;
  sourceId: number;
  alreadyPromoted?: boolean;
  salesLeadId?: number | null;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (alreadyPromoted && salesLeadId) {
    return (
      <a
        href={`/admin/sales?focus=${salesLeadId}`}
        className="kxd-os-btn kxd-os-btn--secondary"
        style={{ textDecoration: "none", fontSize: "0.8rem" }}
        onClick={(e) => e.stopPropagation()}
      >
        Open in Sales
      </a>
    );
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: "0.25rem" }}>
      <KxdButton
        type="button"
        variant="secondary"
        disabled={disabled || pending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setError(null);
          startTransition(async () => {
            try {
              const res = await fetch("/api/admin/acquisition/promote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sourceType, sourceId }),
              });
              const data = (await res.json()) as {
                success?: boolean;
                error?: string;
                href?: string;
              };
              if (!res.ok || !data.success) {
                setError(data.error || "Promotion failed.");
                return;
              }
              if (data.href) {
                router.push(data.href);
                return;
              }
              router.refresh();
            } catch {
              setError("Promotion failed.");
            }
          });
        }}
      >
        {pending ? "Promoting…" : "Promote to Sales"}
      </KxdButton>
      {error ? <span className="kxd-os-meta">{error}</span> : null}
    </span>
  );
}
