import Link from "next/link";

const CLIENT_OPS_LINKS = [
  { id: "command", label: "Command Center", path: "client-command" },
  { id: "work", label: "Work", path: "work" },
  { id: "workspace", label: "Workspace", path: "client-command" },
  { id: "timeline", label: "Timeline", path: "timeline" },
  { id: "infrastructure", label: "Infrastructure", path: "infrastructure" },
] as const;

export type ClientOpsNavId = (typeof CLIENT_OPS_LINKS)[number]["id"];

export function ClientOpsNav({
  clientId,
  active,
}: {
  clientId: number;
  active: ClientOpsNavId;
}) {
  return (
    <nav className="kxd-os-workspace-tabs" aria-label="Client operations">
      {CLIENT_OPS_LINKS.map((link) => {
        const isActive = link.id === active;
        const href =
          link.path === "client-command"
            ? `/admin/operations/client-command/${clientId}`
            : `/admin/operations/${link.path}/${clientId}`;
        return (
          <Link
            key={link.id}
            href={href}
            className={`kxd-os-workspace-tab${isActive ? " kxd-os-workspace-tab--active" : ""}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
