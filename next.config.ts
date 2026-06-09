import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
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
