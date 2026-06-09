import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/pricing",
        destination: "/investment",
        permanent: true,
      },
    ];
  },
  serverExternalPackages: [
    "payload",
    "@payloadcms/db-postgres",
    "@payloadcms/db-sqlite",
    "sharp",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "kreatebydesign.com",
      },
    ],
  },
};

export default withPayload(nextConfig);
