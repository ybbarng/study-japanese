import { describe, expect, it } from "vitest";
import { charInfos, isTappableChar, particleNote } from "./kana-info";

const texts = (s: string) => charInfos(s).map((c) => c.text);

describe("charInfos", () => {
  it("요음은 두 글자를 한 단위로 묶는다", () => {
    expect(texts("きょう")).toEqual(["きょ", "う"]);
  });

  it("기본 글자는 표시 없이 소리 id·한글 근사치·소리 파일이 붙는다", () => {
    expect(charInfos("か")[0]).toEqual({
      text: "か",
      script: "hira",
      soundId: "ka",
      romaji: "ka",
      ko: "카",
      marks: [],
      inexact: undefined,
      audio: true,
    });
  });

  it("가타카나 탁음은 가타카나·탁음으로 적는다", () => {
    const [ga] = charInfos("ガ");
    expect(ga.script).toBe("kata");
    expect(ga.marks).toEqual(["dakuten"]);
    expect(ga.soundId).toBe("ga");
  });

  it("반탁음을 표시한다", () => {
    expect(charInfos("ぱ")[0].marks).toEqual(["handakuten"]);
  });

  it("요음은 소리 파일이 없다(가나 레슨이 요음을 녹음하지 않았다)", () => {
    const [kyo] = charInfos("きょ");
    expect(kyo.marks).toEqual(["yoon"]);
    expect(kyo.audio).toBe(false);
  });

  it("つ·ず·づ·ふ·ん은 한글로 정확히 못 적는 소리로 표시한다", () => {
    for (const ch of ["つ", "ず", "づ", "ふ", "ん"])
      expect(charInfos(ch)[0].inexact, ch).toMatch(/정확히 못 적음/);
  });

  it("한글로 거의 그대로 적히는 소리에는 표시가 없다", () => {
    for (const ch of ["か", "な", "ま"])
      expect(charInfos(ch)[0].inexact, ch).toBeUndefined();
  });

  it("촉음·장음은 소리 대신 하는 일을 적고 정확히 못 적는 소리로 표시한다", () => {
    const [, sokuon] = charInfos("きって");
    expect(sokuon.marks).toEqual(["sokuon"]);
    expect(sokuon.ko).toBe("(한 박자 멈춤)");
    expect(sokuon.inexact).toMatch(/정확히|못 적음/);
    const chouon = charInfos("テー")[1];
    expect(chouon.marks).toEqual(["chouon"]);
    expect(chouon.script).toBe("kata");
  });

  it("ん은 발음 표시를 단다", () => {
    expect(charInfos("ん")[0].marks).toEqual(["hatsuon"]);
  });

  it("한자는 한자로, 문장 부호는 기호로 적고 기호는 누르지 않는다", () => {
    const [kanji, mark] = charInfos("山。");
    expect(kanji.script).toBe("kanji");
    expect(kanji.soundId).toBeUndefined();
    expect(isTappableChar(kanji)).toBe(true);
    expect(mark.script).toBe("other");
    expect(isTappableChar(mark)).toBe(false);
  });

  it("홀로 떨어진 작은 글자는 작은 글자로 표시한다", () => {
    expect(charInfos("ぁ")[0].marks).toEqual(["small"]);
  });
});

describe("particleNote", () => {
  it("조사 は·へ는 다르게 읽는다고 알린다", () => {
    expect(particleNote("は", "助詞")).toBe("조사로 쓰일 때는 '와'로 읽는다.");
    expect(particleNote("へ", "助詞")).toBe("조사로 쓰일 때는 '에'로 읽는다.");
  });

  it("조사가 아니면 알리지 않는다", () => {
    expect(particleNote("は", "名詞")).toBeNull();
    expect(particleNote("が", "助詞")).toBeNull();
  });
});
