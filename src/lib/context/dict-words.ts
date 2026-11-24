import type { DictEntry } from "@/lib/dictionary/entries";
import type { DictInflection } from "@/lib/dictionary/index-server";
import { hasKanji } from "@/lib/ilmuta/ruby";
import type { CueWord, InflectedWord } from "./cards";

// 교재 낱말 사전 색인(일무따 단어·드릴 낱말·예문 분석 낱말)에서, 받아 적은 자막 줄에 칩으로 달 낱말을 고른다.
// 받아 적은 글은 틀릴 수 있어 칩도 확실한 것만 둔다. 화면을 모르는 순수 함수다.
// ① 한자 낱말은 읽는 법이 하나로 정해진 것만(何 なに·なん처럼 둘이면 어느 쪽인지 모른다)
// ② 예문 분석에서만 나온 낱말은 뜻이 하나인 것만(문장마다 뜻을 달리 적었으면 그 자리 뜻을 모른다),
//    조사·조동사·접사는 뺀다(낱말 칩으로 보일 것이 아니다)
// ③ upto가 있으면 그 일무따 강까지 나온 낱말만

const NOT_A_CHIP = new Set(["助詞", "助動詞", "接頭辞", "接尾辞", "記号"]);

function chipOf(e: DictEntry): CueWord | null {
  const ko = e.glosses[0];
  if (!ko) return null;
  const analysisOnly = e.sources.every((s) => s === "analysis");
  if (analysisOnly && e.glosses.length !== 1) return null;
  if (analysisOnly && e.pos.some((p) => NOT_A_CHIP.has(p))) return null;
  if (!hasKanji(e.word)) return { ja: e.word, ko };
  if (e.readings.length !== 1) return null;
  return { ja: e.word, reading: e.readings[0], ko };
}

export interface DictChips {
  words: CueWord[];
  inflected: InflectedWord[];
}

/**
 * 사전 색인에서 칩 낱말과, 예문 분석에 나온 활용한 꼴(→ 그 기본형 칩).
 * upto는 일무따 강 번호(그 강까지 나온 것만). 없으면 모두.
 */
export function dictChips(
  entries: readonly DictEntry[],
  inflections: readonly DictInflection[],
  upto?: number,
): DictChips {
  const inRange = (lesson: number | null) =>
    upto === undefined || (lesson !== null && lesson <= upto);
  const byWord = new Map<string, CueWord>();
  for (const e of entries) {
    if (!inRange(e.firstLesson)) continue;
    const chip = chipOf(e);
    if (chip) byWord.set(e.word, chip);
  }
  const inflected: InflectedWord[] = [];
  for (const f of inflections) {
    const word = byWord.get(f.base);
    if (word && inRange(f.lesson) && f.surface !== word.ja)
      inflected.push({ form: f.surface, word });
  }
  return { words: [...byWord.values()], inflected };
}
