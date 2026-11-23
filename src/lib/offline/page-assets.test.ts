import { describe, expect, it } from "vitest";
import { FakeCache } from "./__fixtures__/fakes";
import { DownloadError, type FetchLike } from "./download";
import { savePages, staticAssetUrls } from "./page-assets";

// Next가 내보내는 HTML 모양을 줄인 것
const HTML = `<!DOCTYPE html><html><head>
<link rel="stylesheet" href="/_next/static/chunks/app-1a2b.css" data-precedence="next"/>
<link rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/webpack-9f8e.js"/>
</head><body><script src="/_next/static/chunks/main-app-77aa.js" async=""></script>
<script>self.__next_f.push([1,"0:[\\"$\\",\\"script\\",{\\"src\\":\\"/_next/static/chunks/main-app-77aa.js\\"}]"])</script>
</body></html>`;

const CSS =
  '@font-face{font-family:x;src:url(/_next/static/media/noto-kr.p.woff2) format("woff2")}';

function site(pages: Record<string, { status?: number; body: string }>) {
  const calls: string[] = [];
  const fetch: FetchLike = async (url) => {
    calls.push(url);
    const p = pages[url];
    if (!p) return new Response("없음", { status: 404 });
    return new Response(p.body, {
      status: p.status ?? 200,
      headers: {
        "Content-Type": url.endsWith(".css") ? "text/css" : "text/html",
      },
    });
  };
  return { fetch, calls };
}

describe("빌드 파일 주소 뽑기", () => {
  it("HTML 속 link·script와 RSC 글 속 주소를 한 번씩 뽑는다", () => {
    expect(staticAssetUrls(HTML)).toEqual([
      "/_next/static/chunks/app-1a2b.css",
      "/_next/static/chunks/webpack-9f8e.js",
      "/_next/static/chunks/main-app-77aa.js",
    ]);
  });

  it("CSS 속 url()의 글꼴 주소를 뽑는다", () => {
    expect(staticAssetUrls(CSS)).toEqual([
      "/_next/static/media/noto-kr.p.woff2",
    ]);
  });
});

describe("화면 받아 두기", () => {
  it("화면 HTML을 화면 캐시에, 빌드 파일과 CSS 속 글꼴을 빌드 캐시에 넣는다", async () => {
    const pageCache = new FakeCache();
    const staticCache = new FakeCache();
    const { fetch } = site({
      "/ilmuta/1": { body: HTML },
      "/_next/static/chunks/app-1a2b.css": { body: CSS },
      "/_next/static/chunks/webpack-9f8e.js": { body: "js" },
      "/_next/static/chunks/main-app-77aa.js": { body: "js" },
      "/_next/static/media/noto-kr.p.woff2": { body: "font" },
    });
    await savePages(["/ilmuta/1"], { pageCache, staticCache, fetch });
    expect(await (await pageCache.match("/ilmuta/1"))?.text()).toBe(HTML);
    expect([...staticCache.entries.keys()].sort()).toEqual([
      "/_next/static/chunks/app-1a2b.css",
      "/_next/static/chunks/main-app-77aa.js",
      "/_next/static/chunks/webpack-9f8e.js",
      "/_next/static/media/noto-kr.p.woff2",
    ]);
  });

  it("빌드 캐시에 이미 있는 파일은 다시 받지 않는다", async () => {
    const staticCache = new FakeCache();
    staticCache.seed("/_next/static/chunks/main-app-77aa.js", 2);
    const { fetch, calls } = site({
      "/ilmuta/1": {
        body: '<script src="/_next/static/chunks/main-app-77aa.js">',
      },
    });
    await savePages(["/ilmuta/1"], {
      pageCache: new FakeCache(),
      staticCache,
      fetch,
    });
    expect(calls).toEqual(["/ilmuta/1"]);
  });

  it("화면을 받지 못하면(로그인 풀림 401) 로그인 오류로 멈춘다", async () => {
    const { fetch } = site({ "/ilmuta/1": { status: 401, body: "" } });
    const err = await savePages(["/ilmuta/1"], {
      pageCache: new FakeCache(),
      staticCache: new FakeCache(),
      fetch,
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(DownloadError);
    expect((err as DownloadError).kind).toBe("auth");
  });
});
