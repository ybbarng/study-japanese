// study-japanese service worker
// - 오디오(/media/*): 강 단위로 받아 둔 파일은 캐시에서 준다. <audio>가 보내는 Range 요청도 캐시에서 잘라 준다.
// - 화면: 네트워크 먼저, 끊기거나 4초 안에 오지 않으면 받아 둔 화면(강을 받을 때 앱이 함께 넣는다).
// - 빌드 파일(/_next/static/*): 캐시 먼저(파일 이름에 해시가 있어 바뀌지 않는다).
// - 형태소 분석기 사전(/kuromoji-dict/*): 관리자가 노래를 저장할 때 처음 받은 것을 캐시에 두고 다시 쓴다.
//   미리 받게 하지 않는다(방문자는 쓰지 않는다). kuromoji 판을 올려 사전이 바뀌면 DICT_CACHE 이름을 바꾼다.

const AUDIO_CACHE = "sj-audio-v1"; // 받아 둔 강 오디오. 앱 화면이 넣고 지운다.
const PAGE_CACHE = "sj-pages-v1";
const STATIC_CACHE = "sj-static-v1";
const DICT_CACHE = "sj-kuromoji-0.1.2";
const KEEP = new Set([AUDIO_CACHE, PAGE_CACHE, STATIC_CACHE, DICT_CACHE]);

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
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  if (url.pathname.startsWith("/kuromoji-dict/")) {
    event.respondWith(cacheFirst(request, DICT_CACHE));
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
      return (await cache.match("/")) || offlinePage();
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

function offlinePage() {
  return new Response(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>오프라인</title></head>
<body style="background:#0e1220;color:#ece8df;font-family:system-ui,sans-serif;padding:3rem 1.5rem;line-height:1.6">
<p style="font-size:1.25rem">통신이 끊겼습니다.</p>
<p style="color:#a9a6b8">이 화면은 받아 두지 않았습니다. 받아 둔 강은 <a style="color:#e8553e" href="/offline">받아 둔 강</a>에서 열 수 있습니다.</p>
</body></html>`,
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
