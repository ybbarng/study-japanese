import path from "node:path";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { serveMedia } from "@/lib/media/serve";
import { getDb } from "@/lib/store/db";

// 로그인 확인은 src/proxy.ts가 먼저 한다. 여기 닿은 요청은 로그인한 사람이다.
const MEDIA_DIR = process.env.MEDIA_DIR ?? path.join(process.cwd(), "media");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = (await params).path.map((s) => decodeURIComponent(s));
  return serveMedia(request, segments, {
    mediaDir: MEDIA_DIR,
    db: getDb(),
    sessionToken: request.cookies.get(SESSION_COOKIE)?.value,
    now: Date.now(),
  });
}
