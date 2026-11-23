import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 이미지에 필요한 것만 담는다(docs/DEPLOY.md)
  output: "standalone",
  images: { unoptimized: true },
  // 형태소 분석기(노래 저장 때만 서버에서 돈다)는 번들에 넣지 않고, 실행할 때 읽는 사전 폴더를 이미지에 담는다
  serverExternalPackages: ["kuromoji"],
  outputFileTracingIncludes: {
    "/api/songs/**": ["./node_modules/kuromoji/dict/**"],
  },
};

export default nextConfig;
