// study-japanese service worker
// - 오디오(/media/*): 강 단위로 받아 둔 파일은 캐시에서 준다. <audio>가 보내는 Range 요청도 캐시에서 잘라 준다.
// - 화면: 네트워크 먼저, 끊기거나 4초 안에 오지 않으면 받아 둔 화면(강을 받을 때 앱이 함께 넣는다).
// - 빌드 파일(/_next/static/*): 캐시 먼저(파일 이름에 해시가 있어 바뀌지 않는다).
// - 그림(/pictures/*): 받아 둔 것을 바로 주고 뒤에서 새로 받아 둔다(그림을 고쳐도 다음에 열 때 바뀐다).
// - 자막(/api/transcripts/*): 네트워크 먼저. 강을 받을 때 앱이 넣어 둔 것이 있으면 끊기거나 4초 안에
//   오지 않을 때 그것을 준다(받아 두지 않은 자막은 캐시에 넣지 않는다).
// KEEP에 없는 캐시는 activate 때 지운다(예전 형태소 분석기 사전 캐시 sj-kuromoji-* 도 이때 지워진다).

const AUDIO_CACHE = "sj-audio-v1"; // 받아 둔 강 오디오. 앱 화면이 넣고 지운다.
const PAGE_CACHE = "sj-pages-v1";
const STATIC_CACHE = "sj-static-v1";
const PICTURE_CACHE = "sj-pictures-v1";
const DATA_CACHE = "sj-data-v1"; // 받아 둔 강의 자막 API 응답. 앱 화면이 넣고 지운다.
const KEEP = new Set([
  AUDIO_CACHE,
  PAGE_CACHE,
  STATIC_CACHE,
  PICTURE_CACHE,
  DATA_CACHE,
]);

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (!KEEP.has(key)) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/media/")) {
    event.respondWith(audioResponse(request));
    return;
  }
  if (url.pathname.startsWith("/pictures/")) {
    event.respondWith(staleWhileRevalidate(event, request, PICTURE_CACHE));
    return;
  }
  if (url.pathname.startsWith("/api/transcripts/")) {
    event.respondWith(networkFirstData(request));
    return;
  }
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
  }
});

async function audioResponse(request) {
  const cache = await caches.open(AUDIO_CACHE);
  const cached = await cache.match(request.url);
  if (!cached) return fetch(request);

  const range = request.headers.get("range");
  if (!range) return cached;

  const blob = await cached.blob();
  const match = /bytes=(\d*)-(\d*)/.exec(range);
  if (!match) return cached;
  const size = blob.size;
  let start = match[1] === "" ? size - Number(match[2]) : Number(match[1]);
  let end = match[1] !== "" && match[2] !== "" ? Number(match[2]) : size - 1;
  start = Math.max(0, start);
  end = Math.min(size - 1, end);
  if (start > end) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${size}` },
    });
  }
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": cached.headers.get("Content-Type") || "audio/mpeg",
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}

async function staleWhileRevalidate(event, request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached ?? Response.error());
  if (cached) {
    event.waitUntil(fresh);
    return cached;
  }
  return fresh;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

// 지하철처럼 신호는 잡히는데 데이터가 오지 않을 때: 받아 둔 화면이 있으면 이만큼만 기다린다.
const PAGE_TIMEOUT_MS = 4000;

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  // 같은 화면을 ?step=… 처럼 다른 꼬리로 열어도 받아 둔 화면을 쓴다.
  const cached =
    (await cache.match(request)) ||
    (await cache.match(request, { ignoreSearch: true }));

  const network = fetch(request).then((response) => {
    // 로그인 화면으로 넘어간 응답은 담지 않는다.
    if (response.ok && !response.redirected)
      cache.put(request, response.clone());
    return response;
  });
  // 받아 둔 화면을 먼저 준 뒤 늦게 실패해도 오류로 남기지 않는다.
  network.catch(() => {});

  if (!cached) {
    try {
      return await network;
    } catch {
      // 받아 두지 않은 화면을 첫 화면으로 대신 내주지 않는다(주소는 2강인데 첫 화면이 보여 길을 잃었다)
      return offlinePage(new URL(request.url).pathname);
    }
  }

  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(cached), PAGE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([network, timeout]);
  } catch {
    return cached;
  } finally {
    clearTimeout(timer);
  }
}

async function networkFirstData(request) {
  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(request.url);
  if (!cached) return fetch(request);

  const network = fetch(request).then((response) => {
    // 받아 둔 자막은 새것으로 바꿔 둔다(출처를 닫아 403이 오면 그대로 둔다)
    if (response.ok) cache.put(request.url, response.clone());
    return response;
  });
  network.catch(() => {});

  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(cached), PAGE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([network, timeout]);
  } catch {
    return cached;
  } finally {
    clearTimeout(timer);
  }
}

const BOOK_NAME = { ilmuta: "일무따", ilmunta: "일문따" };

/** 끊긴 채 받아 두지 않은 화면을 열 때 보이는 안내. 강 화면이면 몇 강인지 밝힌다 */
function offlinePage(pathname) {
  const lesson = /^\/(ilmuta|ilmunta)\/(\d+)\/?$/.exec(pathname);
  // 일무따는 "3강은", 일문따는 "3과는"
  const what = lesson
    ? `${BOOK_NAME[lesson[1]]} ${lesson[2]}${lesson[1] === "ilmuta" ? "강은" : "과는"}`
    : "";
  const title = lesson ? `${what} 받아 두지 않았습니다` : "받아 두지 않은 화면";
  const body = lesson
    ? `이 강은 받아 두지 않아 통신이 끊긴 지금은 열 수 없습니다. 통신이 되는 곳에서 이 강 화면의 "받기"를 누르면 다음부터는 끊겨도 열립니다.`
    : "이 화면은 받아 두지 않아 통신이 끊긴 지금은 열 수 없습니다.";
  const link =
    "display:block;margin-top:1rem;padding:.9rem 1rem;border-radius:.75rem;text-decoration:none;text-align:center";
  return new Response(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>오프라인</title></head>
<body style="margin:0;background:#0e1220;color:#ece8df;font-family:system-ui,sans-serif;line-height:1.6">
<main data-offline-fallback style="max-width:32rem;margin:0 auto;padding:3rem 1rem">
<p style="color:#a9a6b8;font-size:.875rem;margin:0">통신이 끊겼습니다</p>
<h1 style="font-size:1.375rem;margin:.25rem 0 1rem">${title}</h1>
<p style="color:#cfcbd8">${body}</p>
<a style="${link};background:#e8553e;color:#0e1220;font-weight:600" href="/offline">받아 둔 강 목록</a>
<a style="${link};border:1px solid #3a3f55;color:#ece8df" href="/">첫 화면</a>
<button type="button" onclick="location.reload()" style="${link};width:100%;background:none;border:0;color:#a9a6b8;font:inherit;cursor:pointer">다시 시도</button>
</main>
</body></html>`,
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
