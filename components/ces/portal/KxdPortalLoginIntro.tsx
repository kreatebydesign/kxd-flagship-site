/**
 * @deprecated Import KxdSignatureExperience from ./KxdSignatureExperience instead.
 */
import { KxdSignatureExperience } from "./KxdSignatureExperience";

export function KxdPortalLoginIntro(props: { enabled: boolean; clientId?: number }) {
  return (
    <KxdSignatureExperience
      enabled={props.enabled}
      clientId={props.clientId ?? 0}
    />
  );
}

export { KxdSignatureExperience };