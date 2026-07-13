import type { MorningFirstAction } from "@/lib/rituals/morning-first-action";
import type { UserFacingExplainability } from "@/lib/executive-intelligence";
import { WhyThisDisclosure } from "@/components/admin/executive-intelligence/WhyThisDisclosure";

export function MorningFirstActionSection({
  action,
  explainability,
}: {
  action: MorningFirstAction;
  explainability?: UserFacingExplainability | null;
}) {
  return (
    <section className="kxd-os-ritual-first-action" aria-label={action.title}>
      <h2 className="kxd-os-ritual-first-action__heading">{action.title}</h2>

      {!action.hasAction ? (
        <p className="kxd-os-ritual-first-action__calm">{action.label}</p>
      ) : (
        <div className="kxd-os-ritual-first-action__body">
          <p className="kxd-os-ritual-first-action__label">{action.label}</p>
          {action.clientName ? (
            <p className="kxd-os-ritual-first-action__client">{action.clientName}</p>
          ) : null}
          {action.itemTitle ? (
            <p className="kxd-os-ritual-first-action__item">{action.itemTitle}</p>
          ) : null}
          {action.detail ? (
            <p className="kxd-os-ritual-first-action__detail">{action.detail}</p>
          ) : null}
          {action.href ? (
            <p className="kxd-os-ritual-first-action__link-row">
              <a href={action.href} className="kxd-os-ritual-first-action__link">
                {action.hrefLabel ?? "Open"}
              </a>
            </p>
          ) : null}
          <WhyThisDisclosure explainability={explainability} />
        </div>
      )}
    </section>
  );
}
