import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth/server";
import { canSeeLyrics } from "@/lib/songs/schema";
import { getDb } from "@/lib/store/db";
import { listSongs, toSummary } from "@/lib/store/songs";

/** 노래 목록. 방문자에게는 가사를 공개한 노래만 */
export async function GET() {
  const isAdmin = await isAdminRequest();
  const items = listSongs(getDb())
    .filter((s) => canSeeLyrics(s, isAdmin))
    .map(toSummary);
  return NextResponse.json({ items });
}
