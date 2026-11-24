import type { CacheLike, FetchLike } from "./download";
import { DownloadError, ERROR_TEXT } from "./download";

// 강 화면을 끊긴 곳에서도 열 수 있게 화면 HTML과 그 화면이 부르는 빌드 파일(JS·CSS·글꼴)을 받아 둔다.
// 화면은 service worker가 "네트워크 먼저, 끊기면 캐시"로 준다(public/sw.js).

const STATIC_URL = /\/_next\/static\/[^"'()\s\\<>]+/g;

/** HTML·CSS 글에서 빌드 파일 주소(`/_next/static/…`)를 뽑는다. 같은 주소는 한 번만 */
export function staticAssetUrls(text: string): string[] {
  return [...new Set(text.match(STATIC_URL) ?? [])].map((u) =>
    u.replace(/&amp;/g, "&"),
  );
}

interface SavePagesOptions {
  pageCache: CacheLike;
  staticCache: CacheLike;
  fetch: FetchLike;
  signal?: AbortSignal;
}

/**
 * 화면들을 새로 받아 화면 캐시에 넣고, 화면과 CSS가 부르는 빌드 파일 가운데 캐시에 없는 것을 받는다.
 * 화면은 늘 새로 받는다(들은 기록 같은 내용이 바뀌므로). 빌드 파일은 이름에 해시가 있어 있으면 건너뛴다.
 */
export async function savePages(
  pageUrls: readonly string[],
  { pageCache, staticCache, fetch, signal }: SavePagesOptions,
): Promise<void> {
  const assets = new Set<string>();
  for (const url of pageUrls) {
    const html = await fetchText(url, fetch, signal, "text/html");
    await pageCache.put(
      url,
      new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }),
    );
    for (const a of staticAssetUrls(html)) assets.add(a);
  }
  await saveStaticAssets([...assets], { staticCache, fetch, signal });
}

/**
 * 빌드 파일 가운데 캐시에 없는 것을 받는다. CSS가 부르는 글꼴 등도 따라 받는다.
 * 화면 HTML에 적히지 않고 쓸 때 불러오는 덩어리(펼친 재생 화면 등)도 이것으로 담는다.
 */
export async function saveStaticAssets(
  urls: readonly string[],
  {
    staticCache,
    fetch,
    signal,
  }: Pick<SavePagesOptions, "staticCache" | "fetch" | "signal">,
): Promise<void> {
  for (const url of urls) {
    if (await staticCache.match(url)) continue;
    const response = await safeFetch(url, fetch, signal);
    if (!response.ok) continue; // 빌드가 바뀌어 사라진 파일은 건너뛴다
    const body = await response.blob();
    await staticCache.put(
      url,
      new Response(body, { headers: response.headers }),
    );
    if (url.endsWith(".css")) {
      for (const nested of staticAssetUrls(await body.text())) {
        if (!(await staticCache.match(nested))) {
          const r = await safeFetch(nested, fetch, signal);
          if (r.ok) await staticCache.put(nested, r);
        }
      }
    }
  }
}

async function safeFetch(
  url: string,
  fetch: FetchLike,
  signal: AbortSignal | undefined,
  accept?: string,
): Promise<Response> {
  try {
    return await fetch(url, {
      signal,
      credentials: "same-origin",
      headers: accept ? { Accept: accept } : undefined,
    });
  } catch {
    if (signal?.aborted) throw new DownloadError("aborted", ERROR_TEXT.aborted);
    throw new DownloadError("network", ERROR_TEXT.network);
  }
}

async function fetchText(
  url: string,
  fetch: FetchLike,
  signal: AbortSignal | undefined,
  accept: string,
): Promise<string> {
  const response = await safeFetch(url, fetch, signal, accept);
  if (response.redirected || response.status === 401)
    throw new DownloadError("auth", ERROR_TEXT.auth);
  if (!response.ok)
    throw new DownloadError("http", `${ERROR_TEXT.http} (${response.status})`);
  return response.text();
}
