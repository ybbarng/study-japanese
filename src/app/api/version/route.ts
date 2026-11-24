import { NextResponse } from "next/server";

// 지금 떠 있는 이미지의 커밋. 배포 뒤 점검(scripts/check-prod.ts --wait-sha)이 새 커밋이 떴는지 본다.
// GIT_SHA는 이미지를 빌드할 때 넣는다(Dockerfile, .github/workflows/image.yml).
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { sha: process.env.GIT_SHA || null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
