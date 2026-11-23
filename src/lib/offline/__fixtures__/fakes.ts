import type { CacheLike, FetchLike } from "../download";

// Cache Storage·fetch 가짜. 실제 Cache처럼 넣을 때 본문을 다 읽어 두고,
// 꺼낼 때마다 새 Response를 돌려준다(같은 응답 본문을 두 번 읽지 못하는 실제 동작과 같게).

export class FakeCache implements CacheLike {
  readonly entries = new Map<
    string,
    { body: ArrayBuffer; headers: [string, string][] }
  >();
  failPutWith: Error | null = null;

  async match(url: string) {
    const e = this.entries.get(url);
    if (!e) return undefined;
    return new Response(e.body.slice(0), { headers: e.headers });
  }

  async put(url: string, response: Response) {
    if (this.failPutWith) throw this.failPutWith;
    this.entries.set(url, {
      body: await response.arrayBuffer(),
      headers: [...response.headers.entries()],
    });
  }

  async delete(url: string) {
    return this.entries.delete(url);
  }

  /** 미리 받아 둔 파일 */
  seed(url: string, bytes: number) {
    this.entries.set(url, {
      body: new ArrayBuffer(bytes),
      headers: [
        ["content-type", "audio/mpeg"],
        ["content-length", String(bytes)],
      ],
    });
  }
}

interface Route {
  status?: number;
  bytes?: number;
  redirected?: boolean;
  contentType?: string;
  /** 응답 대신 던질 오류(통신 끊김) */
  throws?: Error;
}

/** 주소별로 정한 응답을 주는 서버. 부른 주소를 차례로 남긴다 */
export function fakeServer(routes: Record<string, Route>) {
  const calls: string[] = [];
  const fetch: FetchLike = async (url, init) => {
    calls.push(url);
    if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError");
    const r = routes[url];
    if (!r) return new Response("없음", { status: 404 });
    if (r.throws) throw r.throws;
    const response = new Response(new Uint8Array(r.bytes ?? 0), {
      status: r.status ?? 200,
      headers: { "Content-Type": r.contentType ?? "audio/mpeg" },
    });
    if (r.redirected)
      Object.defineProperty(response, "redirected", { value: true });
    return response;
  };
  return { fetch, calls };
}
