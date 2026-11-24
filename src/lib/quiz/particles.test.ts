import { describe, expect, it } from "vitest";
import { seededRng } from "@/lib/ilmunta/random";
import { rubyPlain } from "@/lib/ilmunta/ruby-text";
import {
  koParticleToJa,
  particleItems,
  particleQuestions,
  particleTargets,
} from "./particles";

const find = (dict: string, noun: string) => {
  const it = particleItems().find(
    (x) => x.dict === dict && rubyPlain(x.before).endsWith(noun),
  );
  if (!it) throw new Error(`${dict} ${noun} 없음`);
  return it;
};

describe("koParticleToJa", () => {
  it("한국어 구절 끝 조사를 보통 옮기는 일본어 조사로 바꾼다", () => {
    expect(koParticleToJa("커피를")).toBe("を");
    expect(koParticleToJa("엄마에게")).toBe("に");
    expect(koParticleToJa("이 강에서")).toBe("で");
    expect(koParticleToJa("일본어로")).toBe("で");
    expect(koParticleToJa("일이")).toBe("が");
    expect(koParticleToJa("일찍")).toBeNull();
  });
});

describe("조사 문장 만들기", () => {
  it("장면 구절 끝 조사를 빈칸으로 두고 뒤에 정중체 서술어를 붙인다", () => {
    const it = find("乗る", "電車");
    expect(it.answer).toBe("に");
    expect(rubyPlain(it.after)).toBe("乗ります。");
    expect(it.ko).toBe("전철을 탑니다.");
  });

  it("한국어 조사와 일본어 조사가 어긋나면 헷갈리기 쉬운 문장으로 표시한다", () => {
    expect(find("乗る", "電車").koDiffers).toBe(true);
    expect(find("飲む", "コーヒー").koDiffers).toBe(false);
  });

  it("な형용사 好き는 대상에 が를 쓰고 한국어는 '~을 좋아합니다'다", () => {
    const it = find("好き", "猫");
    expect(it.answer).toBe("が");
    expect(rubyPlain(it.after)).toBe("好きです。");
    expect(it.ko).toBe("고양이를 좋아합니다.");
  });

  it("한국어 조사대로 옮겨도 맞는 문장(일본어로 말하다)은 답이 둘이라 내지 않는다", () => {
    const talk = particleItems().filter(
      (x) => x.dict === "話す" && rubyPlain(x.before).endsWith("日本語"),
    );
    expect(talk).toEqual([]);
  });

  it("まで는 で로 끝나도 で 문제로 내지 않는다", () => {
    const walk = particleItems().filter((x) => x.dict === "歩く");
    expect(walk).toEqual([]);
  });

  it("지나가는 곳에 を를 쓰는 동사는 で를 보기에서 뺀다", () => {
    expect(find("走る", "公園").alsoFits).toEqual(["で"]);
  });
});

describe("과마다 낼 쓰임 문제", () => {
  it("5과는 が를 쓰는 な형용사만 묻는다", () => {
    expect(particleTargets(5).map((x) => x.dict)).toEqual(["好き", "上手"]);
  });

  it("27과(헷갈리기 쉬운 조사)는 한국어와 어긋나는 문장만 묻는다", () => {
    const targets = particleTargets(27);
    expect(targets.length).toBeGreaterThan(3);
    expect(targets.filter((x) => !x.koDiffers)).toEqual([]);
  });

  it("조사를 다루지 않는 과는 묻지 않는다", () => {
    expect(particleQuestions(8, seededRng(1))).toEqual([]);
  });

  it("문제는 서로 다른 낱말로 3개, 보기에 정답이 하나 있고 다른 답이 될 조사는 없다", () => {
    for (let seed = 0; seed < 30; seed++) {
      const qs = particleQuestions(26, seededRng(seed));
      expect(qs).toHaveLength(3);
      const dicts = qs.map((q) => q.key.split(":")[2]);
      expect(new Set(dicts).size).toBe(3);
      for (const q of qs) {
        const labels = q.options.map((o) => o.label);
        expect(new Set(labels).size).toBe(labels.length);
        expect(labels.length).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
