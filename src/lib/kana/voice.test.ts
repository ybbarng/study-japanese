import { describe, expect, it } from "vitest";
import { pickJapaneseVoice } from "./voice";

const voice = (lang: string, name: string, localService = false) => ({
  lang,
  name,
  localService,
});

describe("낱말 소리용 일본어 음성 고르기", () => {
  it("일본어 음성이 없으면 null", () => {
    expect(pickJapaneseVoice([voice("ko-KR", "Yuna", true)])).toBeNull();
  });

  it("맥의 장난 음성보다 표준 발음 음성을 고른다", () => {
    const picked = pickJapaneseVoice([
      voice("ja-JP", "Eddy (일본어(일본))", true),
      voice("ja-JP", "Shelley (일본어(일본))", true),
      voice("ja-JP", "Kyoko", true),
    ]);
    expect(picked?.name).toBe("Kyoko");
  });

  it("같은 급이면 기기 안 음성을 먼저 고른다", () => {
    const picked = pickJapaneseVoice([
      voice("ja-JP", "Google 日本語"),
      voice("ja-JP", "Kyoko", true),
    ]);
    expect(picked?.name).toBe("Kyoko");
  });

  it("장난 음성뿐이면 그것이라도 고른다", () => {
    expect(
      pickJapaneseVoice([voice("ja-JP", "Grandma (일본어(일본))", true)])?.name,
    ).toBe("Grandma (일본어(일본))");
  });

  it("밑줄로 쓴 언어 표시(ja_JP)도 일본어로 본다", () => {
    expect(pickJapaneseVoice([voice("ja_JP", "日本語")])?.name).toBe("日本語");
  });
});
