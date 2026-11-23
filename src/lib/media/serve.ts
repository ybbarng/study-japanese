import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { DatabaseSync } from "node:sqlite";
import { Readable } from "node:stream";
import {
  canSeeSource,
  type SiteSettings,
  sourceOfMedia,
} from "@/lib/sources/registry";
import { type MediaLimits, sessionKey, takeMediaQuota } from "./quota";
import { parseRange, resolveMediaPath } from "./resolve";

// 남의 자료(교재 오디오·PDF)를 내준다. 출처마다 공개 여부를 따르고(src/lib/sources),
// 하루 전송량 상한을 센다(관리자는 세션별, 방문자는 모두 합쳐 한 세션).

export interface ServeDeps {
  mediaDir: string;
  db: DatabaseSync;
  /** 관리자 로그인 쿠키 값(관리자 전송량을 따로 세는 데만 쓴다) */
  sessionToken: string | undefined;
  /** 쿠키가 확인된 관리자인지. 아니면 모든 방문자를 한 세션으로 묶어 센다 */
  isAdmin: boolean;
  settings: SiteSettings;
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
  if (!canSeeSource(sourceOfMedia(segments[0]), deps.isAdmin, deps.settings)) {
    return new Response(
      "지금은 공개하지 않는 자료입니다. 원래 자료는 출판사에서 받을 수 있습니다.",
      { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

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
    {
      session: deps.isAdmin ? sessionKey(deps.sessionToken) : "anonymous",
      bytes,
      now: deps.now,
    },
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
