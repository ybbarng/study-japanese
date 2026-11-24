import { describe, expect, it } from "vitest";
import { FakeCache } from "./__fixtures__/fakes";
import type { FetchLike } from "./download";
import {
  codePointsOf,
  fontFaces,
  fontsFor,
  parseUnicodeRange,
} from "./font-faces";
import { saveFonts } from "./page-assets";

// next/font/google이 내보내는 CSS 모양을 줄인 것: CSS 파일 기준 상대 주소, 글자 범위마다 조각 하나
const CSS_URL = "/_next/static/chunks/0abc.css";
const CSS = [
  "@font-face{font-family:Noto Sans JP;font-style:normal;font-weight:100 900;font-display:swap;",
  'src:url(../media/jp-kana.s.woff2) format("woff2");unicode-range:U+3000-30FF}',
  '@font-face{font-family:Noto Sans JP;src:url(../media/jp-kanji.s.woff2) format("woff2");',
  "unicode-range:U+4E00-4E9F,U+5C71}",
  '@font-face{font-family:Noto Sans KR;src:url(../media/kr-hangul.s.woff2) format("woff2");',
  "unicode-range:U+AC00-AD7F}",
  '@font-face{font-family:Noto Sans KR;src:url(../media/kr-latin.p.woff2) format("woff2");',
  "unicode-range:U+00??,U+0131}",
].join("");

describe("글꼴 CSS 읽기", () => {
  it("상대 주소를 CSS 파일 기준 사이트 경로로 바꾸고 글자 범위를 함께 뽑는다", () => {
    expect(fontFaces(CSS, CSS_URL)).toEqual([
      {
        url: "/_next/static/media/jp-kana.s.woff2",
        ranges: [[0x3000, 0x30ff]],
      },
      {
        url: "/_next/static/media/jp-kanji.s.woff2",
        ranges: [
          [0x4e00, 0x4e9f],
          [0x5c71, 0x5c71],
        ],
      },
      {
        url: "/_next/static/media/kr-hangul.s.woff2",
        ranges: [[0xac00, 0xad7f]],
      },
      {
        url: "/_next/static/media/kr-latin.p.woff2",
        ranges: [
          [0x00, 0xff],
          [0x131, 0x131],
        ],
      },
    ]);
  });

  it("물음표 범위(U+4E??)는 00~FF로 편다", () => {
    expect(parseUnicodeRange("U+4E??")).toEqual([[0x4e00, 0x4eff]]);
  });
});

describe("쓰인 글자의 조각 고르기", () => {
  it("강 화면·자막에 쓰인 글자를 맡는 조각만 고른다", () => {
    // 가나 하나·한자 山(U+5C71)·한글 가(U+AC00)
    const used = codePointsOf(["やま", "山", "가"]);
    expect(fontsFor(fontFaces(CSS, CSS_URL), used)).toEqual([
      "/_next/static/media/jp-kana.s.woff2",
      "/_next/static/media/jp-kanji.s.woff2",
      "/_next/static/media/kr-hangul.s.woff2",
    ]);
  });

  it("글자 범위가 없는 조각은 늘 고른다", () => {
    const faces = fontFaces("@font-face{src:url(../media/all.woff2)}", CSS_URL);
    expect(fontsFor(faces, new Set())).toEqual([
      "/_next/static/media/all.woff2",
    ]);
  });
});

describe("글꼴 조각 받아 두기", () => {
  function server() {
    const calls: string[] = [];
    const fetch: FetchLike = async (url) => {
      calls.push(url);
      return new Response(new Uint8Array(10), {
        headers: { "Content-Type": "font/woff2" },
      });
    };
    return { fetch, calls };
  }

  it("받아 둔 CSS에서 쓰인 글자의 조각을 받아 빌드 캐시에 넣고, 이미 있는 조각은 건너뛴다", async () => {
    const staticCache = new FakeCache();
    await staticCache.put(CSS_URL, new Response(CSS));
    staticCache.seed("/_next/static/media/jp-kana.s.woff2", 10);
    const { fetch, calls } = server();

    const bytes = await saveFonts([CSS_URL], ["やま 山"], {
      staticCache,
      fetch,
    });

    expect(calls).toEqual(["/_next/static/media/jp-kanji.s.woff2"]);
    expect(bytes).toBe(10);
    expect(
      await staticCache.match("/_next/static/media/jp-kanji.s.woff2"),
    ).toBeDefined();
  });

  it("캐시에 없는 CSS는 건너뛴다(받지 않는다)", async () => {
    const { fetch, calls } = server();
    await saveFonts([CSS_URL], ["山"], { staticCache: new FakeCache(), fetch });
    expect(calls).toEqual([]);
  });
});
