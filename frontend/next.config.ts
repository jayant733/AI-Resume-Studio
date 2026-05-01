import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // Typecheck is run separately in CI/dev; disable Next's build-time spawn to avoid EPERM on some Windows setups.
    ignoreBuildErrors: true,
  },
  experimental: {
    // Avoid child_process spawn on Windows-restricted environments.
    workerThreads: true,
  },
};

export default nextConfig;
