import { describe, expect, it } from "vitest";
import {
  hangulMatchScore,
  hangulPhones,
  kanaPhones,
  phoneSimilarity,
} from "./phonetic";

describe("kanaPhones", () => {
  it("가나를 자음·모음 자모열로 바꾼다", () => {
    expect(kanaPhones("すきな")).toBe("SuKina");
  });

  it("가타카나도 히라가나처럼 바꾼다", () => {
    expect(kanaPhones("スキナ")).toBe("SuKina");
  });

  it("작은 ゃゅょ는 앞 글자의 i를 떼고 붙인다", () => {
    expect(kanaPhones("きょう")).toBe("Kyo");
  });

  it("ㅅ·ㅈ 무리 뒤에서는 y를 뺀다(じょ와 ぞ를 같게 본다)", () => {
    expect(kanaPhones("じょ")).toBe(kanaPhones("ぞ"));
  });

  it("장음(おう·えい·ー)은 뺀다", () => {
    expect(kanaPhones("とうきょう")).toBe("ToKyo");
    expect(kanaPhones("せんせい")).toBe("SeNSe");
    expect(kanaPhones("コーヒー")).toBe("Kohi");
  });

  it("한자와 기호는 버린다", () => {
    expect(kanaPhones("好き。")).toBe("Ki");
  });
});

describe("hangulPhones", () => {
  it("한글을 같은 자모열로 바꾼다", () => {
    expect(hangulPhones("스키나")).toBe("SuKina");
  });

  it("평음·격음·된소리를 같게 본다", () => {
    expect(hangulPhones("까노조")).toBe(hangulPhones("가노조"));
    expect(hangulPhones("타")).toBe(hangulPhones("다"));
  });

  it("받침 ㄴ·ㅇ은 N이 된다", () => {
    expect(hangulPhones("강")).toBe("KaN");
  });

  it("ㅐ와 ㅔ는 같게 본다", () => {
    expect(hangulPhones("해")).toBe(hangulPhones("헤"));
  });

  it("일본어를 적을 때 쓰지 않는 ㅓ와 받침 ㄹ은 따로 둔다", () => {
    expect(hangulPhones("허")).not.toBe(hangulPhones("호"));
    expect(hangulPhones("불")).toBe("PuL");
  });

  it("한글이 아닌 글자는 버린다", () => {
    expect(hangulPhones("'스키' 2반")).toBe("SuKiPaN");
  });
});

describe("hangulMatchScore", () => {
  it("짧은 글은 똑같거나 소리 하나가 빠지거나 덧붙은 것만 받는다", () => {
    expect(hangulMatchScore(hangulPhones("스키"), kanaPhones("すき"))).toBe(1);
    expect(
      hangulMatchScore(hangulPhones("독이"), kanaPhones("とくい")),
    ).toBeCloseTo(0.8);
  });

  it("짧은 글에서 모음 하나가 바뀐 것은 받지 않는다(한국어 낱말이 우연히 닮은 꼴)", () => {
    expect(hangulMatchScore(hangulPhones("동사"), kanaPhones("でんしゃ"))).toBe(
      0,
    );
  });

  it("자모 4개 이하는 똑같아야 한다", () => {
    expect(hangulMatchScore(hangulPhones("수카"), kanaPhones("すき"))).toBe(0);
  });

  it("자모 10개 넘는 글은 둘까지 다른 것을 받는다", () => {
    const kana = kanaPhones("いただきます");
    expect(hangulMatchScore(hangulPhones("이따다키마수"), kana)).toBe(1);
    // 자모 11개 중 둘이 다르다
    expect(hangulMatchScore(hangulPhones("이따나기마시"), kana)).toBeCloseTo(
      9 / 11,
    );
    expect(hangulMatchScore(hangulPhones("이따나기모시"), kana)).toBe(0);
  });
});

describe("phoneSimilarity", () => {
  it("한글로 적힌 일본어 낱말은 그 가나와 닮았다", () => {
    expect(phoneSimilarity(hangulPhones("니가떼"), kanaPhones("にがて"))).toBe(
      1,
    );
    expect(
      phoneSimilarity(hangulPhones("독이"), kanaPhones("とくい")),
    ).toBeCloseTo(0.8);
  });

  it("소리가 다른 낱말은 닮지 않았다", () => {
    expect(
      phoneSimilarity(hangulPhones("학생"), kanaPhones("せんせい")),
    ).toBeLessThan(0.5);
  });

  it("빈 글은 0이다", () => {
    expect(phoneSimilarity("", "Ka")).toBe(0);
  });
});
