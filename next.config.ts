import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module and must not be bundled by Turbopack/webpack.
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    serverActions: {
      // MP4 uploads travel through a Server Action.
      bodySizeLimit: "200mb",
    },
  },
};

export default nextConfig;
