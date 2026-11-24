import { describe, expect, it } from "vitest";
import { pictureOf, sceneOf, wordPictureSrc } from "@/lib/pictures";
import { emptyWordTap } from "@/lib/word-tap/types";
import { pictureUrlsOf, wordTapWords } from "./server-pack";

// 그림 표에 실제로 있는 낱말(교재 문장이 아니라 그림 표의 열쇠)
const DRAWN = "学生";

describe("pictureUrlsOf", () => {
  it("그린 그림이 있는 낱말은 그 그림 파일 주소를 넣는다", () => {
    const p = pictureOf(DRAWN);
    expect(p?.kind).toBe("svg");
    expect(pictureUrlsOf([DRAWN], [], { book: "ilmunta", no: 1 })).toEqual([
      p?.kind === "svg" ? p.src : "",
    ]);
  });

  it("그림이 없는 낱말은 넣지 않는다", () => {
    expect(pictureUrlsOf(["ほげほげ"], [], { book: "ilmunta", no: 1 })).toEqual(
      [],
    );
  });

  it("자막 카드의 그림 id와 강의 장면 그림을 한 번씩 넣는다", () => {
    const scene = sceneOf("ilmuta", 3);
    expect(scene).toBeDefined();
    const urls = pictureUrlsOf([], ["m01-x", "m01-x"], {
      book: "ilmuta",
      no: 3,
    });
    expect(urls).toEqual([wordPictureSrc("m01-x"), scene?.src]);
  });
});

describe("wordTapWords", () => {
  it("낱말 정보 창이 그림을 찾는 꼴(기본형, 없으면 보이는 꼴)을 모으고 기호 조각은 뺀다", () => {
    const wordTap = {
      ...emptyWordTap(3),
      analyses: {
        "テストを書いた。": {
          grammar: [],
          tokens: [
            { surface: "テスト" },
            { surface: "を", base: "を" },
            { surface: "書い", base: "書く" },
            { surface: "。", plain: true as const },
          ],
        },
      },
    };
    expect(wordTapWords(wordTap)).toEqual(["テスト", "を", "書く"]);
  });
});
