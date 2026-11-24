import type { NextConfig } from "next";
import { securityHeaderRules } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  // Docker 이미지에 필요한 것만 담는다(docs/DEPLOY.md)
  output: "standalone",
  images: { unoptimized: true },
  // 어떤 서버인지 알리지 않는다
  poweredByHeader: false,
  // 보안 머리(docs/security.md)
  async headers() {
    return securityHeaderRules(process.env.NODE_ENV !== "production");
  },
};

export default nextConfig;
