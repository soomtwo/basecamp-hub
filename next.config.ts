import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lmkrgnmmcaqeejronzmj.supabase.co",
      },
    ],
  },
};

export default nextConfig;
