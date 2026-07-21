"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ClientPlanDefinition,
  ClientPlanKey,
  ClientPlanStatus,
  EntitlementModuleKey,
  ResolvedClientEntitlements,
} from "@/lib/client-plans/types";

type CatalogModule = {
  key: string;
  label: string;
  category: string;
};

type PlanApiResponse = {
  ok?: boolean;
  message?: string;
  entitlements?: ResolvedClientEntitlements;
  plan?: ClientPlanDefinition | null;
  catalog?: {
    plans: ClientPlanDefinition[];
    modules: CatalogModule[];
  };
};

function sourceLabel(sources: string[]): string {
  if (sources.includes("legacy-ces")) return "Legacy CES";
  if (sources.includes("plan") && sources.includes("add-on")) {
    return "Plan + add-on";
  }
  if (sources.includes("plan")) return "Included by plan";
  if (sources.includes("add-on")) return "Added manually";
  return sources.join(", ") || "—";
}

export function ClientPlansAccessPanel({ clientId }: { clientId: number }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [entitlements, setEntitlements] =
    useState<ResolvedClientEntitlements | null>(null);
  const [plans, setPlans] = useState<ClientPlanDefinition[]>([]);
  const [modules, setModules] = useState<CatalogModule[]>([]);

  const [planKey, setPlanKey] = useState<ClientPlanKey | "">("");
  const [planStatus, setPlanStatus] = useState<ClientPlanStatus>("legacy");
  const [planNote, setPlanNote] = useState("");
  const [addOns, setAddOns] = useState<EntitlementModuleKey[]>([]);
  const [removed, setRemoved] = useState<EntitlementModuleKey[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/plan`, {
        credentials: "same-origin",
      });
      const json = (await res.json()) as PlanApiResponse;
      if (!res.ok || !json.ok || !json.entitlements) {
        throw new Error(json.message || "Unable to load plan.");
      }
      setEntitlements(json.entitlements);
      setPlans(json.catalog?.plans ?? []);
      setModules(json.catalog?.modules ?? []);
      setPlanKey(json.entitlements.planKey ?? "");
      setPlanStatus(json.entitlements.planStatus);
      setPlanNote(json.entitlements.planNote ?? "");
      setAddOns(json.entitlements.addOnModules);
      setRemoved(json.entitlements.removedModules);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load plan.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    // Initial + clientId-scoped fetch (admin session).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async bootstrap load
    void load();
  }, [load]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.key === planKey) ?? null,
    [plans, planKey],
  );

  const formIsPaused = planStatus === "paused";
  const formIsLegacy = !formIsPaused && (!planKey || planStatus === "legacy");

  const previewEffective = useMemo(() => {
    if (!entitlements) return [];
    // Client-side preview mirrors server precedence for operator clarity.
    if (formIsPaused) return [];
    if (formIsLegacy) {
      return entitlements.legacyModules;
    }
    const base = planKey === "custom" ? [] : selectedPlan?.includedModules ?? [];
    const removedSet = new Set(removed);
    return [...new Set([...base, ...addOns])]
      .filter((m) => !removedSet.has(m))
      .sort();
  }, [
    entitlements,
    formIsPaused,
    formIsLegacy,
    planKey,
    selectedPlan,
    addOns,
    removed,
  ]);

  function toggleList(
    list: EntitlementModuleKey[],
    key: EntitlementModuleKey,
    on: boolean,
  ): EntitlementModuleKey[] {
    if (on) return [...new Set([...list, key])].sort();
    return list.filter((m) => m !== key);
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/plan`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planKey: planKey || null,
          planStatus,
          planNote: planNote.trim() || null,
          addOnModules: addOns,
          removedModules: removed,
        }),
      });
      const json = (await res.json()) as PlanApiResponse;
      if (!res.ok || !json.ok || !json.entitlements) {
        throw new Error(json.message || "Unable to save plan.");
      }
      setEntitlements(json.entitlements);
      setPlanKey(json.entitlements.planKey ?? "");
      setPlanStatus(json.entitlements.planStatus);
      setPlanNote(json.entitlements.planNote ?? "");
      setAddOns(json.entitlements.addOnModules);
      setRemoved(json.entitlements.removedModules);
      setSuccess("Plans & Access saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save plan.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="kxd-os-card kxd-plans-access" aria-busy="true">
        <p className="kxd-os-section__label">Plans & Access</p>
        <p className="kxd-os-meta">Loading entitlements…</p>
      </section>
    );
  }

  return (
    <section className="kxd-os-card kxd-plans-access">
      <div className="kxd-plans-access__head">
        <div>
          <p className="kxd-os-section__label">Plans & Access</p>
          <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
            Commercial packaging controls which portal modules and reporting
            capabilities this client receives. Plan notes stay internal.
          </p>
        </div>
        {formIsPaused ? (
          <span className="kxd-plans-access__badge kxd-plans-access__badge--warn">
            Paused
          </span>
        ) : formIsLegacy ? (
          <span className="kxd-plans-access__badge">Legacy access</span>
        ) : (
          <span className="kxd-plans-access__badge kxd-plans-access__badge--active">
            Explicit plan
          </span>
        )}
      </div>

      {formIsPaused ? (
        <p className="kxd-os-meta kxd-plans-access__state-note" role="status">
          Paused clears portal access. CES module history is preserved until an
          active plan is saved again.
        </p>
      ) : null}
      {formIsLegacy ? (
        <p className="kxd-os-meta kxd-plans-access__state-note" role="status">
          Legacy mode keeps the existing experience-profile module list. Assign
          a plan to manage access from the catalog.
        </p>
      ) : null}

      <div className="kxd-plans-access__grid">
        <label className="kxd-plans-access__field">
          Assigned plan
          <select
            value={planKey}
            onChange={(e) =>
              setPlanKey(e.target.value as ClientPlanKey | "")
            }
            disabled={saving}
            aria-label="Assigned plan"
          >
            <option value="">— Legacy (no plan) —</option>
            {plans.map((plan) => (
              <option key={plan.key} value={plan.key}>
                {plan.label}
              </option>
            ))}
          </select>
        </label>

        <label className="kxd-plans-access__field">
          Plan status
          <select
            value={planStatus}
            onChange={(e) =>
              setPlanStatus(e.target.value as ClientPlanStatus)
            }
            disabled={saving}
            aria-label="Plan status"
          >
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="paused">Paused</option>
            <option value="legacy">Legacy</option>
          </select>
        </label>
      </div>

      {selectedPlan ? (
        <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
          {selectedPlan.description}
        </p>
      ) : null}

      <label className="kxd-plans-access__field" style={{ marginTop: "1rem" }}>
        Internal plan note
        <textarea
          value={planNote}
          onChange={(e) => setPlanNote(e.target.value)}
          rows={2}
          placeholder="Operator-only. Never shown to portal users."
          disabled={saving}
          aria-label="Internal plan note"
        />
      </label>

      <div className="kxd-plans-access__columns">
        <div>
          <p className="kxd-os-metric__label">Included by plan</p>
          <ul className="kxd-plans-access__list">
            {(selectedPlan?.includedModules ?? []).length === 0 ? (
              <li className="kxd-os-meta">None (custom / legacy)</li>
            ) : (
              (selectedPlan?.includedModules ?? []).map((key) => (
                <li key={key}>
                  {modules.find((m) => m.key === key)?.label ?? key}
                </li>
              ))
            )}
          </ul>
        </div>

        <div>
          <p className="kxd-os-metric__label">Add-ons</p>
          <div className="kxd-plans-access__checks">
            {modules.map((mod) => (
              <label key={`add-${mod.key}`} className="kxd-plans-access__check">
                <input
                  type="checkbox"
                  checked={addOns.includes(mod.key)}
                  disabled={saving}
                  onChange={(e) =>
                    setAddOns(toggleList(addOns, mod.key, e.target.checked))
                  }
                />
                {mod.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="kxd-os-metric__label">Removed from plan</p>
          <div className="kxd-plans-access__checks">
            {modules.map((mod) => (
              <label key={`rm-${mod.key}`} className="kxd-plans-access__check">
                <input
                  type="checkbox"
                  checked={removed.includes(mod.key)}
                  disabled={saving}
                  onChange={(e) =>
                    setRemoved(toggleList(removed, mod.key, e.target.checked))
                  }
                />
                {mod.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="kxd-plans-access__effective">
        <p className="kxd-os-metric__label">Effective access</p>
        {previewEffective.length === 0 ? (
          <p className="kxd-os-meta">
            {formIsPaused
              ? "No portal modules while paused."
              : "No entitled modules."}
          </p>
        ) : (
          <ul className="kxd-plans-access__list kxd-plans-access__list--effective">
            {previewEffective.map((key) => {
              const source =
                entitlements?.moduleSources.find((s) => s.module === key)
                  ?.sources ?? [];
              const isAddOn = addOns.includes(key);
              const inPlan = selectedPlan?.includedModules.includes(key);
              let label = "Effective";
              if (formIsLegacy) label = "Legacy CES";
              else if (isAddOn && inPlan) label = "Plan + add-on";
              else if (isAddOn) label = "Added manually";
              else if (inPlan) label = "Included by plan";
              else if (source.length) label = sourceLabel(source);
              return (
                <li key={key}>
                  <strong>
                    {modules.find((m) => m.key === key)?.label ?? key}
                  </strong>
                  <span>{label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div aria-live="polite">
        {error ? <p className="kxd-plans-access__error">{error}</p> : null}
        {success ? <p className="kxd-plans-access__success">{success}</p> : null}
      </div>

      <div className="kxd-plans-access__actions">
        <button
          type="button"
          className="kxd-plans-access__save"
          disabled={saving}
          aria-busy={saving}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save Plans & Access"}
        </button>
        <button
          type="button"
          className="kxd-os-link-quiet"
          disabled={saving}
          onClick={() => void load()}
        >
          Reset
        </button>
      </div>
    </section>
  );
}
