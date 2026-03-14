import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/finance/pricing", destination: "/program-pricing", permanent: false },
      { source: "/pricing-plans", destination: "/program-pricing?tab=plans", permanent: false },
      { source: "/programs", destination: "/settings/programs", permanent: false },
      { source: "/belts", destination: "/settings/belts", permanent: false },
      { source: "/admin/pricing", destination: "/program-pricing", permanent: false },
    ];
  },
};

export default nextConfig;
