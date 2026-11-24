import { describe, expect, it } from "vitest";
import { FakeCache, fakeServer } from "./__fixtures__/fakes";
import {
  DownloadError,
  downloadFiles,
  downloadGroups,
  inspectFiles,
  type Progress,
  removeFiles,
} from "./download";

const A = "/media/ilmuta/1.%20%EC%9D%8C%EC%84%B1%20%EA%B0%95%EC%9D%98/L01.mp3";
const B = "/media/ilmuta/2.%20%EC%98%88%EB%AC%B8%20mp3/01-1.mp3";
const C = "/media/ilmuta/2.%20%EC%98%88%EB%AC%B8%20mp3/01-2.mp3";

async function failure(p: Promise<unknown>): Promise<DownloadError> {
  try {
    await p;
  } catch (err) {
    if (err instanceof DownloadError) return err;
    throw err;
  }
  throw new Error("실패해야 하는데 성공했다");
}

describe("파일 받기", () => {
  it("모든 파일을 받아 캐시에 넣고 크기를 적어 둔다", async () => {
    const cache = new FakeCache();
    const server = fakeServer({ [A]: { bytes: 300 }, [B]: { bytes: 120 } });
    const result = await downloadFiles([A, B], { cache, fetch: server.fetch });
    expect(result).toEqual({ done: 2, total: 2, bytes: 420 });
    const saved = await cache.match(A);
    expect(saved?.headers.get("content-length")).toBe("300");
    expect(saved?.headers.get("content-type")).toBe("audio/mpeg");
  });

  it("이미 캐시에 있는 파일은 다시 받지 않고 크기만 더한다(이어 받기)", async () => {
    const cache = new FakeCache();
    cache.seed(A, 300);
    const server = fakeServer({ [A]: { bytes: 300 }, [B]: { bytes: 120 } });
    const result = await downloadFiles([A, B], { cache, fetch: server.fetch });
    expect(server.calls).toEqual([B]);
    expect(result.bytes).toBe(420);
  });

  it("진행을 0개에서 시작해 파일을 마칠 때마다 알린다", async () => {
    const cache = new FakeCache();
    const server = fakeServer({ [A]: { bytes: 10 }, [B]: { bytes: 20 } });
    const seen: Progress[] = [];
    await downloadFiles([A, B], {
      cache,
      fetch: server.fetch,
      onProgress: (p) => seen.push(p),
    });
    expect(seen[0]).toEqual({ done: 0, total: 2, bytes: 0 });
    expect(seen.filter((p) => p.bytes === 10 && p.done === 1)).toHaveLength(1);
    expect(seen.at(-1)).toEqual({ done: 2, total: 2, bytes: 30 });
  });

  it("갈래마다 다른 캐시에 넣고 진행은 모두 합쳐 센다", async () => {
    const audio = new FakeCache();
    const pictures = new FakeCache();
    const PIC = "/pictures/words/m01-cat.svg";
    const server = fakeServer({
      [A]: { bytes: 300 },
      [PIC]: { bytes: 2, contentType: "image/svg+xml" },
    });
    const result = await downloadGroups(
      [
        { urls: [A], cache: audio },
        { urls: [PIC], cache: pictures },
      ],
      { fetch: server.fetch },
    );
    expect(result).toEqual({ done: 2, total: 2, bytes: 302 });
    expect([...audio.entries.keys()]).toEqual([A]);
    expect([...pictures.entries.keys()]).toEqual([PIC]);
  });

  it("로그인 화면으로 넘어간 응답은 캐시에 넣지 않고 로그인 오류로 멈춘다", async () => {
    const cache = new FakeCache();
    const server = fakeServer({
      [A]: { bytes: 50, redirected: true, contentType: "text/html" },
    });
    const err = await failure(
      downloadFiles([A], { cache, fetch: server.fetch }),
    );
    expect(err.kind).toBe("auth");
    expect(cache.entries.size).toBe(0);
  });

  it("401 응답도 로그인 오류다", async () => {
    const server = fakeServer({ [A]: { status: 401 } });
    const err = await failure(
      downloadFiles([A], { cache: new FakeCache(), fetch: server.fetch }),
    );
    expect(err.kind).toBe("auth");
  });

  it("서버가 파일을 주지 않으면 그 파일에서 멈추고 앞서 받은 파일은 남긴다", async () => {
    const cache = new FakeCache();
    const server = fakeServer({ [A]: { bytes: 10 }, [B]: { status: 404 } });
    const err = await failure(
      downloadFiles([A, B, C], { cache, fetch: server.fetch }),
    );
    expect(err.kind).toBe("http");
    expect([...cache.entries.keys()]).toEqual([A]);
    expect(server.calls).toEqual([A, B]);
  });

  it("통신이 끊기면 통신 오류로 멈춘다", async () => {
    const server = fakeServer({
      [A]: { throws: new TypeError("fetch failed") },
    });
    const err = await failure(
      downloadFiles([A], { cache: new FakeCache(), fetch: server.fetch }),
    );
    expect(err.kind).toBe("network");
  });

  it("취소하면 다음 파일을 받지 않고 취소 오류로 멈춘다", async () => {
    const cache = new FakeCache();
    const server = fakeServer({ [A]: { bytes: 10 }, [B]: { bytes: 10 } });
    const controller = new AbortController();
    const err = await failure(
      downloadFiles([A, B], {
        cache,
        fetch: server.fetch,
        signal: controller.signal,
        onProgress: (p) => {
          if (p.done === 1) controller.abort();
        },
      }),
    );
    expect(err.kind).toBe("aborted");
    expect(server.calls).toEqual([A]);
  });

  it("저장 공간이 모자라 캐시에 못 넣으면 공간 오류다", async () => {
    const cache = new FakeCache();
    cache.failPutWith = new DOMException("full", "QuotaExceededError");
    const server = fakeServer({ [A]: { bytes: 10 } });
    const err = await failure(
      downloadFiles([A], { cache, fetch: server.fetch }),
    );
    expect(err.kind).toBe("quota");
  });
});

describe("받아 둔 것 살펴보기와 지우기", () => {
  it("캐시에 남은 파일 수와 크기를 센다", async () => {
    const cache = new FakeCache();
    cache.seed(A, 300);
    cache.seed(C, 50);
    expect(await inspectFiles([A, B, C], cache)).toEqual({
      present: 2,
      total: 3,
      bytes: 350,
    });
  });

  it("크기가 적혀 있지 않은 응답은 본문 길이로 센다", async () => {
    const cache = new FakeCache();
    cache.entries.set(A, { body: new ArrayBuffer(77), headers: [] });
    expect((await inspectFiles([A], cache)).bytes).toBe(77);
  });

  it("주어진 주소만 캐시에서 지운다", async () => {
    const cache = new FakeCache();
    cache.seed(A, 1);
    cache.seed(B, 1);
    await removeFiles([A], cache);
    expect([...cache.entries.keys()]).toEqual([B]);
  });
});
