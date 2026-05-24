import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow ngrok tunnels to reach the dev server (cross-origin protection in Next.js 13.5+).
  // Read NEXT_PUBLIC_APP_URL too so reading it back at runtime is consistent.
  allowedDevOrigins: [
    "*.ngrok-free.app",
    "*.ngrok.app",
    "*.ngrok.io",
  ],
  // Hide the bottom-corner dev indicator badge during demos.
  devIndicators: false,
};

export default nextConfig;
