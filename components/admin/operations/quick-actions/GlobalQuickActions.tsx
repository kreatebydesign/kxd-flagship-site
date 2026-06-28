import { getGlobalQuickActions } from "@/lib/quick-actions";
import { QuickActionButton } from "./QuickActionButton";

export function GlobalQuickActions({ compact }: { compact?: boolean }) {
  const actions = getGlobalQuickActions();

  return (
    <div className={`kxd-os-quick-action-bar${compact ? " kxd-os-quick-action-bar--compact" : ""}`}>
      <p className="kxd-os-quick-action-bar__label">Quick actions</p>
      <div className="kxd-os-ops-quick-grid kxd-os-quick-action-bar__grid">
        {actions.map((action) => (
          <QuickActionButton key={action.id} action={action} compact={compact} />
        ))}
      </div>
    </div>
  );
}
