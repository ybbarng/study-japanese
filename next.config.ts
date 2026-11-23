import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 이미지에 필요한 것만 담는다(docs/DEPLOY.md)
  output: "standalone",
  images: { unoptimized: true },
};

export default nextConfig;
