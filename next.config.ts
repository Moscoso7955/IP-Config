import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* No server data layer — the app stores each visitor's map in their own
     browser (localStorage). Nothing to configure here. */
};

export default nextConfig;
