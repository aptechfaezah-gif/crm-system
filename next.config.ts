import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  serverExternalPackages: ["mssql", "tedious", "bcryptjs"],
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
    staleTimes: {
      dynamic: 60,
      static: 180,
    },
  },
};

export default nextConfig;
