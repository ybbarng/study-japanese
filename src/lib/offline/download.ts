import { declaredSize } from "./size";

// 파일 여러 개를 차례로 받아 캐시에 넣는다. 이미 캐시에 있는 파일은 건너뛰어
// 끊겼다가 다시 누르면 남은 파일부터 이어 받는다(파일 단위).
// 캐시·fetch는 밖에서 넣는다(브라우저에서는 Cache Storage와 window.fetch).

/** Cache Storage의 `Cache` 가운데 쓰는 부분 */
export interface CacheLike {
  match(url: string): Promise<Response | undefined>;
  put(url: string, response: Response): Promise<void>;
  delete(url: string): Promise<boolean>;
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface Progress {
  /** 다 받은(또는 이미 있던) 파일 수 */
  done: number;
  total: number;
  /** 다 받은 파일 크기 + 지금 받는 파일에서 받은 만큼 */
  bytes: number;
}

export type DownloadErrorKind =
  | "aborted" // 사용자가 취소
  | "auth" // 로그인이 풀려 로그인 화면으로 넘어감
  | "http" // 서버가 파일을 주지 않음(404 등)
  | "network" // 통신 끊김
  | "quota"; // 저장 공간 모자람

export class DownloadError extends Error {
  constructor(
    readonly kind: DownloadErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "DownloadError";
  }
}

export const ERROR_TEXT: Record<DownloadErrorKind, string> = {
  aborted: "받기를 멈췄습니다",
  auth: "로그인이 풀렸습니다. 다시 로그인한 뒤 이어 받으세요",
  http: "서버에서 파일을 받지 못했습니다",
  network: "통신이 끊겼습니다. 연결되면 이어 받으세요",
  quota: "폰 저장 공간이 모자랍니다",
};

/** 캐시에 든 응답의 크기. 넣을 때 Content-Length를 적어 두므로 보통 본문을 읽지 않는다 */
export async function cachedSize(response: Response): Promise<number> {
  return declaredSize(response.headers) ?? (await response.blob()).size;
}

export interface Inspection {
  present: number;
  total: number;
  bytes: number;
}

/** 캐시에 몇 개가 남아 있고 크기가 얼마인지(브라우저가 공간이 모자라 지웠을 수도 있다) */
export async function inspectFiles(
  urls: readonly string[],
  cache: CacheLike,
): Promise<Inspection> {
  let present = 0;
  let bytes = 0;
  for (const url of urls) {
    const hit = await cache.match(url);
    if (!hit) continue;
    present += 1;
    bytes += await cachedSize(hit);
  }
  return { present, total: urls.length, bytes };
}

export async function removeFiles(
  urls: readonly string[],
  cache: CacheLike,
): Promise<void> {
  for (const url of urls) await cache.delete(url);
}

interface FetchOptions {
  fetch: FetchLike;
  signal?: AbortSignal;
  onProgress?: (p: Progress) => void;
}

interface DownloadOptions extends FetchOptions {
  cache: CacheLike;
}

/** 넣을 캐시가 같은 파일들(오디오·자막·그림은 캐시가 다르다) */
export interface CacheGroup {
  urls: readonly string[];
  cache: CacheLike;
}

export async function downloadFiles(
  urls: readonly string[],
  { cache, ...options }: DownloadOptions,
): Promise<Progress> {
  return downloadGroups([{ urls, cache }], options);
}

/** 여러 캐시에 나눠 넣을 파일을 차례로 받는다. 진행은 모두 합쳐 센다 */
export async function downloadGroups(
  groups: readonly CacheGroup[],
  { fetch, signal, onProgress }: FetchOptions,
): Promise<Progress> {
  const total = groups.reduce((n, g) => n + g.urls.length, 0);
  const progress: Progress = { done: 0, total, bytes: 0 };
  onProgress?.({ ...progress });
  for (const { urls, cache } of groups) {
    for (const url of urls) {
      throwIfAborted(signal);
      const hit = await cache.match(url);
      if (hit) {
        progress.bytes += await cachedSize(hit);
      } else {
        const base = progress.bytes;
        const size = await fetchIntoCache(url, cache, fetch, signal, (got) =>
          onProgress?.({ ...progress, bytes: base + got }),
        );
        progress.bytes = base + size;
      }
      progress.done += 1;
      onProgress?.({ ...progress });
    }
  }
  return progress;
}

async function fetchIntoCache(
  url: string,
  cache: CacheLike,
  fetch: FetchLike,
  signal: AbortSignal | undefined,
  onBytes: (got: number) => void,
): Promise<number> {
  let response: Response;
  try {
    response = await fetch(url, { signal, credentials: "same-origin" });
  } catch (err) {
    throw toDownloadError(err, signal);
  }
  if (response.redirected || response.status === 401)
    throw new DownloadError("auth", ERROR_TEXT.auth);
  if (!response.ok)
    throw new DownloadError("http", `${ERROR_TEXT.http} (${response.status})`);

  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let got = 0;
  try {
    const reader = response.body?.getReader();
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        got += value.byteLength;
        onBytes(got);
      }
    }
  } catch (err) {
    throw toDownloadError(err, signal);
  }
  throwIfAborted(signal);

  const contentType =
    response.headers.get("content-type") ?? "application/octet-stream";
  const blob = new Blob(chunks, { type: contentType });
  try {
    await cache.put(
      url,
      new Response(blob, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(blob.size),
        },
      }),
    );
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError")
      throw new DownloadError("quota", ERROR_TEXT.quota);
    throw err;
  }
  return blob.size;
}

function throwIfAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted) throw new DownloadError("aborted", ERROR_TEXT.aborted);
}

function toDownloadError(err: unknown, signal: AbortSignal | undefined) {
  if (err instanceof DownloadError) return err;
  if (signal?.aborted) return new DownloadError("aborted", ERROR_TEXT.aborted);
  return new DownloadError("network", ERROR_TEXT.network);
}
