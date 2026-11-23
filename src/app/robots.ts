import type { MetadataRoute } from "next";

// 남의 자료를 모은 개인 학습 사이트라 검색엔진에 올리지 않는다(docs/standing-rules.md "자료 출처와 공개 범위").
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
