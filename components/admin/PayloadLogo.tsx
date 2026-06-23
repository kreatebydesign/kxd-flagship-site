import { KXD_PAYLOAD_LOGO_SRC } from "./payload-brand";

export function PayloadLogo() {
  return (
    <div className="kxd-payload-brand">
      <img
        src={KXD_PAYLOAD_LOGO_SRC}
        alt="Kreate by Design"
        className="graphic-logo kxd-payload-logo"
        width={214}
        height={62}
      />
      <p className="kxd-payload-brand__title">KXD OS</p>
      <p className="kxd-payload-brand__subtitle">Creative Operations Platform</p>
    </div>
  );
}
