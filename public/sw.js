// study-japanese service worker
// - 오디오(/media/*): 강 단위로 받아 둔 파일은 캐시에서 준다. <audio>가 보내는 Range 요청도 캐시에서 잘라 준다.
// - 화면: 네트워크 먼저, 끊기면 마지막으로 본 화면.
// - 빌드 파일(/_next/static/*): 캐시 먼저(파일 이름에 해시가 있어 바뀌지 않는다).

const AUDIO_CACHE = "sj-audio-v1"; // 받아 둔 강 오디오. 앱 화면이 넣고 지운다.
const PAGE_CACHE = "sj-pages-v1";
const STATIC_CACHE = "sj-static-v1";
const KEEP = new Set([AUDIO_CACHE, PAGE_CACHE, STATIC_CACHE]);

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

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    // 로그인 화면으로 넘어간 응답은 담지 않는다.
    if (response.ok && !response.redirected)
      cache.put(request, response.clone());
    return response;
  } catch {
    const cached = (await cache.match(request)) || (await cache.match("/"));
    return (
      cached ||
      new Response("오프라인입니다. 받아 둔 강은 강 화면에서 열 수 있습니다.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}
