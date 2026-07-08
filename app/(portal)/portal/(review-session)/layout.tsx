import { redirect } from "next/navigation";
import { CesProfileProvider } from "@/components/ces/providers/CesProfileProvider";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { getPortalSession } from "@/lib/portal/session";
import { needsPortalWelcome } from "@/lib/portal/welcome";
import "../../../../design-system/os/styles/kxd-os.css";
import "../../../../design-system/ces/styles/kxd-ces.css";

export default async function ReviewSessionLayout({ children }: { children: React.ReactNode }) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");
  if (needsPortalWelcome(session)) redirect("/portal/welcome");

  const experienceProfile = await resolveExperienceProfile(session);

  return (
    <CesProfileProvider profile={experienceProfile}>
      <div className="kxd-review-session-root">{children}</div>
    </CesProfileProvider>
  );
}
