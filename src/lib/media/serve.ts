import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { DatabaseSync } from "node:sqlite";
import { Readable } from "node:stream";
import { type MediaLimits, sessionKey, takeMediaQuota } from "./quota";
import { parseRange, resolveMediaPath } from "./resolve";

// 로그인 뒤 교재 오디오·PDF를 내준다. 로그인 확인은 src/proxy.ts가 먼저 한다.

export interface ServeDeps {
  mediaDir: string;
  db: DatabaseSync;
  /** 로그인 쿠키 값(전송량을 세션별로 세는 데만 쓴다) */
  sessionToken: string | undefined;
  now: number;
  limits?: MediaLimits;
}

// 교재 파일은 바뀌지 않으니 폰이 오래 들고 있게 한다. 공유 캐시(CDN·프록시)에는 남기지 않는다.
const CACHE_CONTROL = "private, max-age=2592000, immutable";

export async function serveMedia(
  request: Request,
  segments: string[],
  deps: ServeDeps,
): Promise<Response> {
  const resolved = resolveMediaPath(deps.mediaDir, segments);
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
    "Cache-Control": CACHE_CONTROL,
  };

  const range = parseRange(request.headers.get("range"), size);
  if (range === "invalid") {
    return new Response(null, {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${size}` },
    });
  }

  const bytes = range === null ? size : range.end - range.start + 1;
  const verdict = takeMediaQuota(
    deps.db,
    { session: sessionKey(deps.sessionToken), bytes, now: deps.now },
    deps.limits,
  );
  if (!verdict.ok) {
    return new Response(
      "오늘 받을 수 있는 교재 오디오 양을 넘었습니다. 받아 둔 강은 그대로 들을 수 있고, 내일(한국 시각 자정) 풀립니다.",
      {
        status: 429,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Retry-After": String(verdict.retryAfterSec),
        },
      },
    );
  }

  const stream = (opts?: { start: number; end: number }) =>
    Readable.toWeb(
      createReadStream(resolved.absolutePath, opts),
    ) as ReadableStream;

  if (range === null) {
    return new Response(stream(), {
      status: 200,
      headers: { ...headers, "Content-Length": String(size) },
    });
  }
  return new Response(stream(range), {
    status: 206,
    headers: {
      ...headers,
      "Content-Length": String(bytes),
      "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
    },
  });
}
