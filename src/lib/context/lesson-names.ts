import { hasKanji } from "@/lib/ilmuta/ruby";
import type { IlmutaLesson } from "@/lib/textbook/schema";
import { charInfos } from "@/lib/word-tap/kana-info";
import { speakerRuby } from "@/lib/word-tap/speaker";
import type { CueWord } from "./cards";

// 그 강 회화에 나오는 사람 이름(말하는 사람 이름표)과, 대사 낱말 분석에서 모은 한자 읽기.
// 강사가 드릴에서 등장인물 이름을 넣어 말한 줄(「うん、～の」)을 알아보는 데 쓴다. 화면을 모르는 순수 함수다.
// 이름표에는 읽는 법이 없어, 대사 안에서 그 이름을 부른 낱말 분석의 읽기를 빌린다(word-tap/speaker.ts와 같다).

/** 낱말 분석 조각(겉글과 읽기) */
export interface NamePiece {
  surface: string;
  reading?: string;
}

/** 한글 음절에 받침 ㄴ을 단다(받침이 이미 있으면 그대로) */
function withNieun(syllable: string): string {
  const code = syllable.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171 || code % 28 !== 0) return syllable;
  return String.fromCharCode(0xac00 + code + 4);
}

/**
 * 가나를 한글 근사치로(이름의 한국어 표기 대신). ん은 앞 글자의 받침 ㄴ으로(サンウ → 산우),
 * 촉음·장음은 적지 않는다.
 */
export function hangulOfKana(kana: string): string {
  let out = "";
  for (const c of charInfos(kana)) {
    if (c.marks.includes("sokuon") || c.marks.includes("chouon")) continue;
    if (c.soundId === "n" && out !== "") {
      out = out.slice(0, -1) + withNieun(out.slice(-1));
      continue;
    }
    out += c.ko ?? "";
  }
  return out;
}

/**
 * 강의 이름표 마디마다 이름 낱말 하나(성·이름을 띄어 쓰면 마디마다). 읽기를 모르는 한자 마디는 뺀다.
 * tokensOf는 문장 글 → 그 문장의 낱말 분석(없으면 null).
 */
export function lessonNames(
  lesson: IlmutaLesson,
  tokensOf: (ja: string) => readonly NamePiece[] | null,
): CueWord[] {
  const sentences = lesson.examples.flatMap((e) => e.sentences);
  const analyses = sentences.map((s) => tokensOf(s.ja));
  const out: CueWord[] = [];
  const seen = new Set<string>();
  for (const speaker of new Set(sentences.map((s) => s.speaker ?? ""))) {
    if (speaker === "") continue;
    for (const part of speakerRuby(speaker, analyses)) {
      const text = part.text.trim();
      if (text === "" || /^[\s・]+$/u.test(text) || seen.has(text)) continue;
      const reading = part.reading ?? (hasKanji(text) ? null : text);
      if (!reading) continue;
      seen.add(text);
      const ko = hangulOfKana(reading);
      out.push(reading === text ? { ja: text, ko } : { ja: text, reading, ko });
    }
  }
  return out;
}

/** 그 강 대사 낱말 분석의 한자 낱말 → 읽기(받아 적은 한자를 가나로 풀 때 보탠다) */
export function analysisGlossary(
  lesson: IlmutaLesson,
  tokensOf: (ja: string) => readonly NamePiece[] | null,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of lesson.examples.flatMap((e) => e.sentences))
    for (const t of tokensOf(s.ja) ?? [])
      if (t.reading && hasKanji(t.surface) && !(t.surface in out))
        out[t.surface] = t.reading;
  return out;
}
