import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "image.bugsm.co.kr" },
    ],
  },
};

export default nextConfig;
