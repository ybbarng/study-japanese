import { NextResponse } from "next/server";
import { loadUpcomingPacks } from "@/lib/offline/server-upcoming";

// 자동 받기가 부른다: 책마다 이어서 할 강 2개의 받을 묶음. 로그인 확인은 src/proxy.ts가 한다.
export async function GET() {
  return NextResponse.json({ packs: await loadUpcomingPacks() });
}
