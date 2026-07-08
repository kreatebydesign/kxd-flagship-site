import type { CSSProperties, ReactNode } from "react";
import {
  parseExecutiveNoteSections,
  splitExecutiveParagraphs,
} from "@/lib/executive-client-workspace/format-executive-text";

export function WorkspaceChapter({
  title,
  eyebrow,
  children,
  action,
  variant = "default",
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  action?: ReactNode;
  variant?: "default" | "compact";
}) {
  return (
    <section
      className={`kxd-os-workspace-chapter${variant === "compact" ? " kxd-os-workspace-chapter--compact" : ""}`}
    >
      {eyebrow && <p className="kxd-os-workspace-chapter__eyebrow">{eyebrow}</p>}
      <div className="kxd-os-workspace-chapter__head">
        <h2 className="kxd-os-workspace-chapter__title">{title}</h2>
        {action}
      </div>
      <div className="kxd-os-workspace-chapter__body">{children}</div>
    </section>
  );
}

export function WorkspaceStat({
  label,
  value,
  prominence = "default",
}: {
  label: string;
  value: string;
  prominence?: "default" | "large" | "hero";
}) {
  return (
    <div
      className={`kxd-os-workspace-stat kxd-os-workspace-stat--${prominence}`}
    >
      <span className="kxd-os-workspace-stat__value">{value}</span>
      <span className="kxd-os-workspace-stat__label">{label}</span>
    </div>
  );
}

export function WorkspaceStatRow({ children }: { children: ReactNode }) {
  return <div className="kxd-os-workspace-stat-row">{children}</div>;
}

export function WorkspaceMetaLine({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="kxd-os-workspace-meta-line">
      <span className="kxd-os-workspace-meta-line__value">{value}</span>
      <span className="kxd-os-workspace-meta-line__label">{label}</span>
    </div>
  );
}

export function WorkspaceProse({ children }: { children: ReactNode }) {
  return <p className="kxd-os-workspace-prose">{children}</p>;
}

export function WorkspaceFormattedText({ text }: { text: string }) {
  const paragraphs = splitExecutiveParagraphs(text);
  if (paragraphs.length === 0) {
    return <WorkspaceProse>—</WorkspaceProse>;
  }

  return (
    <div className="kxd-os-workspace-prose-stack">
      {paragraphs.map((block, index) => (
        <p key={index} className="kxd-os-workspace-prose">
          {block.split("\n").map((line, lineIndex, lines) => (
            <span key={lineIndex}>
              {line}
              {lineIndex < lines.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

export function WorkspaceExecutiveNotes({ text }: { text: string }) {
  const { preamble, sections } = parseExecutiveNoteSections(text);

  if (sections.length === 0) {
    return <WorkspaceFormattedText text={text} />;
  }

  return (
    <div className="kxd-os-workspace-notes">
      {preamble && <WorkspaceFormattedText text={preamble} />}
      {sections.map((section) => (
        <div key={section.label} className="kxd-os-workspace-notes__section">
          <p className="kxd-os-workspace-notes__label">{section.label}</p>
          <WorkspaceFormattedText text={section.content} />
        </div>
      ))}
    </div>
  );
}

export function WorkspaceList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="kxd-os-workspace-list">
      {items.map((item) => (
        <li key={item} className="kxd-os-workspace-list__item">
          <WorkspaceProse>{item}</WorkspaceProse>
        </li>
      ))}
    </ul>
  );
}

export function WorkspaceKpiGrid({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <div className="kxd-os-workspace-kpi-row">
      {items.map((kpi) => (
        <WorkspaceStat key={kpi.label} label={kpi.label} value={kpi.value} prominence="large" />
      ))}
    </div>
  );
}

export function WorkspacePlaceholderBadge({ label }: { label: string }) {
  return <span className="kxd-os-workspace-badge">{label}</span>;
}

/** @deprecated Use WorkspaceChapter */
export function WorkspacePanel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <WorkspaceChapter title={title} action={action}>
      {children}
    </WorkspaceChapter>
  );
}

/** @deprecated Use WorkspaceMetaLine */
export function WorkspaceMetaRow({
  label,
  value,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return <WorkspaceMetaLine label={label} value={value} />;
}

export function WorkspaceEmpty({ message }: { message: string }) {
  return (
    <div className="kxd-os-workspace-empty">
      <WorkspaceProse>{message}</WorkspaceProse>
    </div>
  );
}

/** @deprecated */
export function WorkspaceLabel({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <p className="kxd-os-workspace-notes__label" style={style}>
      {children}
    </p>
  );
}
