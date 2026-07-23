import { redirect } from "next/navigation";

/**
 * Legacy onboarding questionnaire surface — incomplete for founding-client EA.
 * Redirect to workspace home so clients never hit disabled dead-end forms.
 */
export default function PortalOnboardingRedirectPage() {
  redirect("/portal");
}
