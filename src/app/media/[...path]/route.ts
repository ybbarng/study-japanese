import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { parseRange, resolveMediaPath } from "@/lib/media/resolve";

// 로그인 확인은 src/proxy.ts가 먼저 한다. 여기 닿은 요청은 로그인한 사람이다.
const MEDIA_DIR = process.env.MEDIA_DIR ?? path.join(process.cwd(), "media");

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = (await params).path.map((s) => decodeURIComponent(s));
  const resolved = resolveMediaPath(MEDIA_DIR, segments);
  if (!resolved) return new Response("없음", { status: 404 });

  let size: number;
  try {
    const info = await stat(resolved.absolutePath);
    if (!info.isFile()) return new Response("없음", { status: 404 });
    size = info.size;
  } catch {
    return new Response("없음", { status: 404 });
  }

  const headers = {
    "Content-Type": resolved.contentType,
    "Accept-Ranges": "bytes",
    // 교재 오디오: 공유 캐시(CDN·프록시)에 남기지 않는다.
    "Cache-Control": "private, max-age=86400",
  };

  const range = parseRange(request.headers.get("range"), size);
  if (range === "invalid") {
    return new Response(null, {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${size}` },
    });
  }
  if (range === null) {
    const body = Readable.toWeb(
      createReadStream(resolved.absolutePath),
    ) as ReadableStream;
    return new Response(body, {
      status: 200,
      headers: { ...headers, "Content-Length": String(size) },
    });
  }
  const body = Readable.toWeb(
    createReadStream(resolved.absolutePath, range),
  ) as ReadableStream;
  return new Response(body, {
    status: 206,
    headers: {
      ...headers,
      "Content-Length": String(range.end - range.start + 1),
      "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
    },
  });
}
