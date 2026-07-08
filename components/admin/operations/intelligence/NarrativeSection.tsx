import type { ReactNode } from "react";
import { OpsSectionHead } from "@/components/admin/operations/shared/OpsBriefing";

export interface NarrativeSectionProps {
  label: string;
  children: ReactNode;
  href?: string;
  linkText?: string;
  subdued?: boolean;
}

export function NarrativeSection({
  label,
  children,
  href,
  linkText,
  subdued = false,
}: NarrativeSectionProps) {
  return (
    <section
      className={`kxd-os-intelligence-section${subdued ? " kxd-os-intelligence-section--subdued" : ""}`}
    >
      <OpsSectionHead label={label} href={href} linkText={linkText} />
      {children}
    </section>
  );
}
