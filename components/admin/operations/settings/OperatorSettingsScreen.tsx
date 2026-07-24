import {
  KxdPage,
} from "@/components/os";
import { ThemePreferenceControl } from "@/components/os/ThemePreferenceControl";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";

/**
 * Operator Settings — device preferences (Batch E theme system).
 * Visual/preference only; no auth, billing, or workflow changes.
 */
export function OperatorSettingsScreen({
  variant = "full",
}: {
  variant?: "full" | "staff";
}) {
  return (
    <OperationsShell activeId="settings" variant={variant}>
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="Preferences"
          title="Settings"
          lead="Device preferences for the authenticated KXD OS shell."
        />

        <div className="kxd-os-card" style={{ maxWidth: "32rem" }}>
          <ThemePreferenceControl />
        </div>
      </KxdPage>
    </OperationsShell>
  );
}
