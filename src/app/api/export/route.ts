import { NextResponse } from "next/server";
import { rejectUnlessAdmin } from "@/lib/auth/server";
import { getDb } from "@/lib/store/db";
import { listAllListenEvents } from "@/lib/store/listen";
import { listSongs } from "@/lib/store/songs";
import { listStates } from "@/lib/store/state";
import { listWritings } from "@/lib/store/writings";

// 세션이 `pnpm progress:pull`로 받아 저장소 study/progress/에 두는 전체 기록.
export async function GET() {
  const denied = await rejectUnlessAdmin();
  if (denied) return denied;
  const db = getDb();
  return NextResponse.json({
    exportedAt: Date.now(),
    states: listStates(db),
    listenEvents: listAllListenEvents(db),
    writings: listWritings(db),
    songs: listSongs(db),
  });
}
