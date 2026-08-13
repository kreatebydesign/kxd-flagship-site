import { redirect } from "next/navigation";
import { ResourcesScreen } from "@/components/client-hq";
import { isCesModuleEnabled } from "@/lib/ces";
import { isPortalModuleVisible } from "@/lib/ces/modules/visibility";
import { isCampaignHqExperience } from "@/lib/ces/profile/campaign-hq";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { loadPortalBrandKitPresentation } from "@/lib/portal/brand-kit";
import { getPortalResourceCategoriesForClient } from "@/lib/portal/data";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalResourcesPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const profile = await resolveExperienceProfile(session);
  if (!isPortalModuleVisible("resources", { profile })) {
    redirect("/portal");
  }

  const websiteReviewEntitled = isCesModuleEnabled(profile, "website-review");
  const campaignHq = isCampaignHqExperience(profile);

  const [categories, brandKit] = await Promise.all([
    getPortalResourceCategoriesForClient(session.clientId, {
      brandName: profile.identity.clientName,
      supportHref: websiteReviewEntitled ? "/portal/website-review" : "/portal/requests",
      supportTitle: websiteReviewEntitled ? "Submit a website update" : "Submit a request",
      supportDescription: websiteReviewEntitled
        ? "Share precise feedback through Website Review."
        : "Open a new request from your headquarters.",
    }),
    loadPortalBrandKitPresentation(session.clientId),
  ]);

  const useCampaignCopy = campaignHq || Boolean(brandKit) || categories.some((c) => c.id === "brand-kit");
  const title = useCampaignCopy
    ? profile.terminology["nav.resources"]?.trim() ||
      profile.terminology["resources.title"]?.trim() ||
      "Resources"
    : "Resources";
  const lead = useCampaignCopy
    ? profile.terminology["resources.lead"]?.trim() ||
      "Approved brand materials and support references for your workspace."
    : "Guides, training, support, and brand standards for your engagement.";
  const eyebrow = useCampaignCopy
    ? profile.terminology["resources.eyebrow"]?.trim() || "Library"
    : "Library";

  return (
    <ResourcesScreen
      categories={categories}
      brandKit={brandKit}
      eyebrow={eyebrow}
      title={title}
      lead={lead}
    />
  );
}
