import path from "node:path";
import type { NextRequest } from "next/server";
import { isAdminToken } from "@/lib/auth/server";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { serveMedia } from "@/lib/media/serve";
import { readSiteSettings } from "@/lib/sources/settings";
import { getDb } from "@/lib/store/db";

const MEDIA_DIR = process.env.MEDIA_DIR ?? path.join(process.cwd(), "media");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = (await params).path.map((s) => decodeURIComponent(s));
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const db = getDb();
  return serveMedia(request, segments, {
    mediaDir: MEDIA_DIR,
    db,
    sessionToken: token,
    isAdmin: await isAdminToken(token),
    settings: readSiteSettings(db),
    now: Date.now(),
  });
}
