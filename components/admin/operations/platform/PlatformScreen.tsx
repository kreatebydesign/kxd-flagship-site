import Link from "next/link";
import {
  KxdBadge,
  KxdMetric,
  KxdPage,
  KxdSection,
  type KxdBadgeVariant,
} from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import type {
  PlatformDashboardData,
  PlatformMaturity,
  PlatformOwner,
  PlatformPhaseDefinition,
  PlatformPhaseStatus,
  PlatformSubsystemDefinition,
  PlatformSubsystemStatus,
} from "@/lib/platform";

function ownerLabel(owner: PlatformOwner): string {
  switch (owner) {
    case "shared-core":
      return "Shared Core";
    case "agency-edition":
      return "Agency Edition";
    case "platform-owner":
      return "Platform Owner";
  }
}

function maturityVariant(maturity: PlatformMaturity): KxdBadgeVariant {
  switch (maturity) {
    case "production":
      return "success";
    case "beta":
      return "status";
    case "alpha":
      return "warning";
    case "prototype":
      return "pending";
  }
}

function statusVariant(status: PlatformSubsystemStatus): KxdBadgeVariant {
  switch (status) {
    case "stable":
      return "success";
    case "active":
      return "status";
    case "building":
      return "opportunity";
    case "consolidation":
      return "warning";
    case "planned":
      return "pending";
  }
}

function phaseStatusVariant(status: PlatformPhaseStatus): KxdBadgeVariant {
  switch (status) {
    case "completed":
      return "success";
    case "in-progress":
      return "opportunity";
    case "planned":
      return "pending";
  }
}

function phaseStatusLabel(status: PlatformPhaseStatus): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "in-progress":
      return "In Progress";
    case "planned":
      return "Planned";
  }
}

function ProgressBar({ percent, label }: { percent: number; label?: string }) {
  return (
    <div className="kxd-os-platform-progress" aria-label={label ?? `${percent}% complete`}>
      <div className="kxd-os-platform-progress__track">
        <div
          className="kxd-os-platform-progress__fill"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      <span className="kxd-os-platform-progress__value">{percent}%</span>
    </div>
  );
}

function OverviewSection({ data }: { data: PlatformDashboardData }) {
  const { overview } = data;
  const kpis = [
    { label: "Overall completion", value: `${overview.overallCompletionPercent}%` },
    { label: "Shared Core", value: `${overview.sharedCorePercent}%` },
    { label: "Agency Edition", value: `${overview.agencyEditionPercent}%` },
    { label: "Platform Layer", value: `${overview.platformLayerPercent}%` },
    { label: "Current phase", value: overview.meta.currentPhase },
    { label: "Version", value: `v${overview.meta.version}` },
    { label: "Build date", value: overview.meta.buildDate },
    { label: "Edition", value: overview.meta.editionLabel },
  ];

  return (
    <>
      <OperationsPageHero
        eyebrow="KXD Platform · Engineering"
        title="Platform Progress"
        lead={`${overview.meta.currentPhaseTitle} — internal engineering cockpit for platform maturity, roadmap, and architecture health.`}
      />

      <div className="kxd-os-ops-kpi-grid kxd-os-platform-kpi-grid">
        {kpis.map((kpi) => (
          <KxdMetric key={kpi.label} label={kpi.label} value={kpi.value} />
        ))}
      </div>

      <div className="kxd-os-platform-completion-strip">
        <CompletionStripItem label="Overall" percent={overview.overallCompletionPercent} />
        <CompletionStripItem label="Shared Core" percent={overview.sharedCorePercent} />
        <CompletionStripItem label="Agency Edition" percent={overview.agencyEditionPercent} />
        <CompletionStripItem label="Platform Layer" percent={overview.platformLayerPercent} />
      </div>
    </>
  );
}

function CompletionStripItem({ label, percent }: { label: string; percent: number }) {
  return (
    <div className="kxd-os-platform-completion-item">
      <div className="kxd-os-platform-completion-item__head">
        <span className="kxd-os-platform-completion-item__label">{label}</span>
        <span className="kxd-os-platform-completion-item__percent">{percent}%</span>
      </div>
      <ProgressBar percent={percent} label={`${label} completion`} />
    </div>
  );
}

function SubsystemCard({ subsystem }: { subsystem: PlatformSubsystemDefinition }) {
  return (
    <article className="kxd-os-platform-subsystem-card">
      <div className="kxd-os-platform-subsystem-card__head">
        <div>
          {subsystem.href ? (
            <Link href={subsystem.href} className="kxd-os-platform-subsystem-card__title">
              {subsystem.name}
            </Link>
          ) : (
            <h3 className="kxd-os-platform-subsystem-card__title">{subsystem.name}</h3>
          )}
          <p className="kxd-os-meta">{subsystem.category}</p>
        </div>
        <KxdBadge variant={maturityVariant(subsystem.maturity)}>{subsystem.maturity}</KxdBadge>
      </div>

      {subsystem.description ? (
        <p className="kxd-os-platform-subsystem-card__desc">{subsystem.description}</p>
      ) : null}

      <ProgressBar percent={subsystem.completionPercent} label={`${subsystem.name} completion`} />

      <dl className="kxd-os-platform-subsystem-card__meta">
        <div>
          <dt>Owner</dt>
          <dd>{ownerLabel(subsystem.owner)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <KxdBadge variant={statusVariant(subsystem.status)}>{subsystem.status}</KxdBadge>
          </dd>
        </div>
        <div>
          <dt>Last phase</dt>
          <dd>{subsystem.lastCompletedPhase}</dd>
        </div>
        <div>
          <dt>Current phase</dt>
          <dd>{subsystem.currentPhase}</dd>
        </div>
      </dl>

      {subsystem.dependencies.length > 0 ? (
        <p className="kxd-os-platform-subsystem-card__deps">
          <span className="kxd-os-meta">Dependencies · </span>
          {subsystem.dependencies.join(", ")}
        </p>
      ) : null}
    </article>
  );
}

function ArchitectureGroup({
  title,
  subsystems,
  percent,
}: {
  title: string;
  subsystems: PlatformSubsystemDefinition[];
  percent: number;
}) {
  return (
    <div className="kxd-os-platform-arch-group">
      <div className="kxd-os-platform-arch-group__head">
        <h3 className="kxd-os-platform-arch-group__title">{title}</h3>
        <span className="kxd-os-platform-arch-group__count">
          {subsystems.length} subsystems · {percent}%
        </span>
      </div>
      <ProgressBar percent={percent} label={`${title} completion`} />
      <ul className="kxd-os-platform-arch-list">
        {subsystems.map((s) => (
          <li key={s.id} className="kxd-os-platform-arch-list__item">
            <span className="kxd-os-platform-arch-list__name">{s.name}</span>
            <span className="kxd-os-platform-arch-list__maturity">{s.maturity}</span>
            <span className="kxd-os-platform-arch-list__pct">{s.completionPercent}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PhaseRow({ phase }: { phase: PlatformPhaseDefinition }) {
  return (
    <div
      className={`kxd-os-platform-phase-row kxd-os-platform-phase-row--${phase.status}`}
    >
      <div className="kxd-os-platform-phase-row__marker" aria-hidden />
      <div className="kxd-os-platform-phase-row__body">
        <div className="kxd-os-platform-phase-row__head">
          <p className="kxd-os-platform-phase-row__number">Phase {phase.number}</p>
          <KxdBadge variant={phaseStatusVariant(phase.status)}>
            {phaseStatusLabel(phase.status)}
          </KxdBadge>
        </div>
        <h3 className="kxd-os-platform-phase-row__title">{phase.title}</h3>
        <p className="kxd-os-platform-phase-row__desc">{phase.description}</p>
        {phase.completedAt ? (
          <p className="kxd-os-meta">Completed {phase.completedAt}</p>
        ) : null}
      </div>
    </div>
  );
}

function RoadmapPanel({ data }: { data: PlatformDashboardData }) {
  const { roadmap } = data;

  return (
    <div className="kxd-os-platform-roadmap">
      <div className="kxd-os-platform-roadmap__col">
        <p className="kxd-os-section__label">Recently completed</p>
        {roadmap.recentlyCompleted.length === 0 ? (
          <p className="kxd-os-meta">No completed phases recorded.</p>
        ) : (
          <ul className="kxd-os-platform-roadmap__list">
            {roadmap.recentlyCompleted.map((phase) => (
              <li key={phase.id}>
                <span className="kxd-os-platform-roadmap__phase">Phase {phase.number}</span>
                <span className="kxd-os-platform-roadmap__title">{phase.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="kxd-os-platform-roadmap__col kxd-os-platform-roadmap__col--current">
        <p className="kxd-os-section__label">Currently building</p>
        {roadmap.current ? (
          <div className="kxd-os-platform-roadmap__current">
            <p className="kxd-os-platform-roadmap__phase">Phase {roadmap.current.number}</p>
            <p className="kxd-os-platform-roadmap__current-title">{roadmap.current.title}</p>
            <p className="kxd-os-meta">{roadmap.current.description}</p>
          </div>
        ) : (
          <p className="kxd-os-meta">No active phase.</p>
        )}
      </div>

      <div className="kxd-os-platform-roadmap__col">
        <p className="kxd-os-section__label">Up next</p>
        <ul className="kxd-os-platform-roadmap__list">
          {roadmap.planned.map((phase) => (
            <li key={phase.id}>
              <span className="kxd-os-platform-roadmap__phase">Phase {phase.number}</span>
              <span className="kxd-os-platform-roadmap__title">{phase.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function HealthSection({ data }: { data: PlatformDashboardData }) {
  const { health } = data;
  const metrics = [
    { label: "Payload collections", value: String(health.payloadCollections) },
    { label: "Admin routes", value: String(health.adminRoutes) },
    { label: "Portal routes", value: String(health.portalRoutes) },
    { label: "Sales routes", value: String(health.salesRoutes) },
    { label: "Payload hooks", value: String(health.payloadHooks) },
    {
      label: "Automation modules",
      value: `${health.automationModulesConnected}/${health.automationModules} connected`,
    },
    {
      label: "Portal modules",
      value: `${health.portalModulesProduction}/${health.portalModules} production-ready`,
    },
    { label: "Shared Core subsystems", value: String(health.sharedCoreSubsystems) },
    { label: "Agency subsystems", value: String(health.agencySubsystems) },
    { label: "Platform subsystems", value: String(health.platformSubsystems) },
    { label: "Edition modules", value: String(health.kxdEditionModules) },
    { label: "Registry subsystems", value: String(health.libPlatformModules) },
  ];

  return (
    <div className="kxd-os-ops-kpi-grid kxd-os-platform-health-grid">
      {metrics.map((m) => (
        <KxdMetric key={m.label} label={m.label} value={m.value} />
      ))}
    </div>
  );
}

function NorthStarPanel({ principles }: { principles: PlatformDashboardData["principles"] }) {
  return (
    <div className="kxd-os-platform-north-star">
      <p className="kxd-os-platform-north-star__eyebrow">North Star</p>
      <h2 className="kxd-os-platform-north-star__title">Engineering philosophy</h2>
      <ul className="kxd-os-platform-north-star__list">
        {principles.map((principle) => (
          <li key={principle.id}>{principle.text}</li>
        ))}
      </ul>
    </div>
  );
}

export function PlatformScreen({ data }: { data: PlatformDashboardData }) {
  const { overview, subsystems, architecture, phases } = data;

  return (
    <OperationsShell activeId="platform">
      <KxdPage className="kxd-os-page--ops kxd-os-page--platform">
        <OverviewSection data={data} />

        <KxdSection label="Roadmap snapshot" className="kxd-os-platform-section">
          <RoadmapPanel data={data} />
        </KxdSection>

        <KxdSection
          label="Subsystem progress"
          description={`${subsystems.length} major subsystems tracked from Phase 11C boundary inventory.`}
          className="kxd-os-platform-section"
        >
          <div className="kxd-os-platform-subsystem-grid">
            {subsystems.map((subsystem) => (
              <SubsystemCard key={subsystem.id} subsystem={subsystem} />
            ))}
          </div>
        </KxdSection>

        <KxdSection label="Platform architecture" className="kxd-os-platform-section">
          <div className="kxd-os-platform-arch-grid">
            <ArchitectureGroup
              title="Shared Core"
              subsystems={architecture.sharedCore}
              percent={overview.sharedCorePercent}
            />
            <ArchitectureGroup
              title="Agency Edition"
              subsystems={architecture.agencyEdition}
              percent={overview.agencyEditionPercent}
            />
            <ArchitectureGroup
              title="Platform Owner"
              subsystems={architecture.platformOwner}
              percent={overview.platformLayerPercent}
            />
          </div>
        </KxdSection>

        <KxdSection label="Development timeline" className="kxd-os-platform-section">
          <div className="kxd-os-platform-phase-timeline">
            {phases.map((phase) => (
              <PhaseRow key={phase.id} phase={phase} />
            ))}
          </div>
        </KxdSection>

        <KxdSection
          label="Engineering health"
          description="Live counts from codebase — collections, routes, hooks, and module registries."
          className="kxd-os-platform-section"
        >
          <HealthSection data={data} />
        </KxdSection>

        <NorthStarPanel principles={data.principles} />
      </KxdPage>
    </OperationsShell>
  );
}
