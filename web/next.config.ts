import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Make FLASK_CALL_URL available at build time if needed
  env: {
    FLASK_CALL_URL: process.env.FLASK_CALL_URL || "http://localhost:5001",
  },
  // Increase serverless function timeout for long-running AI calls
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
