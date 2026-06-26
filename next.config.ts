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
      {
        source: "/accessibility-statement",
        destination: "/contact",
        permanent: true,
      },
      {
        source: "/blank",
        destination: "/",
        permanent: true,
      },
      {
        source: "/start",
        destination: "/start-project",
        permanent: true,
      },
      {
        source: "/book-online",
        destination: "/contact",
        permanent: true,
      },
      {
        source: "/service-page/online-strategy-session",
        destination: "/contact",
        permanent: true,
      },
    ];
  },
  serverExternalPackages: [
    "payload",
    "@payloadcms/db-postgres",
    "@payloadcms/db-sqlite",
    "sharp",
    // Remotion — contains native Rust compositor binaries; must not be bundled by Next.js
    "remotion",
    "@remotion/renderer",
    "@remotion/bundler",
    "@remotion/compositor-darwin-arm64",
    "@remotion/compositor-darwin-x64",
    "@remotion/compositor-linux-x64-gnu",
    "@remotion/compositor-linux-x64-musl",
    "@remotion/compositor-win32-x64-msvc",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "kreatebydesign.com",
      },
      {
        protocol: "https",
        hostname: "www.kreatebydesign.com",
      },
    ],
  },
};

export default withPayload(nextConfig);