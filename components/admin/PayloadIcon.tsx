import { KXD_PAYLOAD_LOGO_SRC } from "./payload-brand";

export function PayloadIcon() {
  return (
    <img
      src={KXD_PAYLOAD_LOGO_SRC}
      alt="KXD"
      className="graphic-icon kxd-payload-icon"
      width={40}
      height={28}
    />
  );
}
