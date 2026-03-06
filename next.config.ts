import type { NextConfig } from "next";
//Hello
const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/potluck',
        destination: 'https://docs.google.com/forms/d/e/1FAIpQLScyKgwf-9IVeGA2whggj--XZvKuBNuP3gprfVjLJV2fopK1FA/viewform',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
