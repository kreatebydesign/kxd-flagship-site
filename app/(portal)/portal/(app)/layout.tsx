import { PortalNav } from "@/components/portal/PortalNav";

export default function PortalAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--kxd-black-base)" }}>
      <PortalNav />
      <main>{children}</main>
    </div>
  );
}
