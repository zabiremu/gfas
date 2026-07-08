import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained build (.next/standalone) so the Docker runtime
  // image only needs the server bundle + minimal node_modules.
  output: "standalone",
};

export default nextConfig;
