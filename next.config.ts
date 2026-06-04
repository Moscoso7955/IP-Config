import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native Node module; opt it out of Server Component
  // bundling so it's loaded via native require instead of being bundled.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
