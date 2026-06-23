import { KXD_PAYLOAD_LOGO_SRC } from "./payload-brand";

export function PayloadLogo() {
  return (
    <img
      src={KXD_PAYLOAD_LOGO_SRC}
      alt="Kreate by Design"
      className="graphic-logo kxd-payload-logo"
      width={168}
      height={48}
    />
  );
}
