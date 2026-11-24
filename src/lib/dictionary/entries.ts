import type { ShownToken } from "@/lib/songs/analysis";
import { isPressable } from "@/lib/songs/words";

// 교재 낱말 내부 사전: 일무따 단어 코너·회화 낱말, 일문따 드릴 낱말, 예문 낱말 분석에 나온 낱말을
// 기본형 하나로 모은 색인. 뜻은 우리 교재 맥락의 짧은 뜻만 둔다(바깥 사전을 옮기지 않는다).
// 같은 표기에 읽기가 둘인 낱말(何 なに·なん)은 한 항목에 읽기를 모은다. 화면을 모르는 순수 함수다.

export type DictSource = "ilmuta-words" | "drill" | "analysis";

/** 낱말이 나오는 예문 문장 자리 */
export interface DictOccurrence {
  lesson: number;
  example: string;
  index: number;
}

export type DrillKind =
  | { kind: "verb"; group: "godan" | "ichidan" | "suru" | "kuru" }
  | { kind: "adj"; adjKind: "i" | "na" | "noun" };

export interface DictEntry {
  /** 주소에 쓰는 열쇠 = 기본형 표기 */
  id: string;
  word: string;
  readings: string[];
  pos: string[];
  /** 짧은 뜻들(교재 단어 뜻 → 드릴 뜻 → 예문 분석 뜻 차례, 겹치면 하나) */
  glosses: string[];
  /** 일무따에서 처음 배운 강(단어 코너·회화 낱말·예문). 모르면 null */
  firstLesson: number | null;
  /** 일문따에서 처음 나오는 과(드릴 낱말만). 모르면 null */
  ilmuntaLesson: number | null;
  drill?: DrillKind;
  sources: DictSource[];
  occurrences: DictOccurrence[];
}

export interface DictInput {
  /** 일무따 강마다 단어 코너·회화 낱말 */
  ilmutaWords: {
    lesson: number;
    words: { ja: string; reading?: string; ko: string }[];
  }[];
  /** 일문따 드릴 낱말 */
  drill: {
    dict: string;
    reading: string;
    ko: string;
    drill: DrillKind;
    /** word-lessons.ts의 처음 나오는 곳 */
    ilmuta?: number;
    ilmunta?: number;
  }[];
  /** 낱말 분석이 붙은 예문 문장(되풀이된 문장도 자리마다) */
  analyzed: (DictOccurrence & { tokens: readonly ShownToken[] })[];
}

const EDGE_MARKS =
  /^[\s　。、！？!?「」…・〜～]+|[\s　。、！？!?「」…・〜～]+$/g;
const KANA_ONLY = /^[ぁ-ゟ゠-ヿ]+$/;
const MAX_GLOSSES = 4;
const MAX_OCCURRENCES = 40;

export function dictKey(word: string): string {
  return word.replace(EDGE_MARKS, "");
}

function pushUnique<T>(list: T[], value: T | undefined | null) {
  if (
    value !== undefined &&
    value !== null &&
    value !== "" &&
    !list.includes(value)
  )
    list.push(value);
}

function minLesson(
  a: number | null,
  b: number | null | undefined,
): number | null {
  if (b === undefined || b === null) return a;
  return a === null ? b : Math.min(a, b);
}

export function buildDictionary(input: DictInput): DictEntry[] {
  const map = new Map<string, DictEntry>();
  const entry = (word: string): DictEntry => {
    const id = dictKey(word);
    let e = map.get(id);
    if (!e) {
      e = {
        id,
        word: id,
        readings: [],
        pos: [],
        glosses: [],
        firstLesson: null,
        ilmuntaLesson: null,
        sources: [],
        occurrences: [],
      };
      map.set(id, e);
    }
    return e;
  };

  for (const { lesson, words } of input.ilmutaWords)
    for (const w of words) {
      if (dictKey(w.ja) === "") continue;
      const e = entry(w.ja);
      pushUnique(
        e.readings,
        w.reading ?? (KANA_ONLY.test(e.word) ? e.word : undefined),
      );
      pushUnique(e.glosses, w.ko.trim());
      e.firstLesson = minLesson(e.firstLesson, lesson);
      pushUnique(e.sources, "ilmuta-words");
    }

  for (const d of input.drill) {
    const e = entry(d.dict);
    pushUnique(e.readings, d.reading);
    pushUnique(e.glosses, d.ko);
    pushUnique(
      e.pos,
      d.drill.kind === "verb" ? "動詞" : DRILL_POS[d.drill.adjKind],
    );
    e.drill = d.drill;
    e.firstLesson = minLesson(e.firstLesson, d.ilmuta);
    e.ilmuntaLesson = minLesson(e.ilmuntaLesson, d.ilmunta);
    pushUnique(e.sources, "drill");
  }

  for (const s of input.analyzed)
    for (const t of s.tokens) {
      if (!isPressable({ ...t, plain: t.plain })) continue;
      const base = t.base ?? t.surface;
      if (dictKey(base) === "") continue;
      const e = entry(base);
      // 읽는 법은 겉모양 그대로 쓴 낱말만(활용한 꼴의 읽기는 기본형 읽기가 아니다)
      if (base === t.surface)
        pushUnique(
          e.readings,
          t.reading ?? (KANA_ONLY.test(base) ? base : undefined),
        );
      pushUnique(e.pos, t.pos);
      if (e.glosses.length < MAX_GLOSSES) pushUnique(e.glosses, t.gloss);
      e.firstLesson = minLesson(e.firstLesson, s.lesson);
      pushUnique(e.sources, "analysis");
      const seen = e.occurrences.some(
        (o) =>
          o.lesson === s.lesson &&
          o.example === s.example &&
          o.index === s.index,
      );
      if (!seen && e.occurrences.length < MAX_OCCURRENCES)
        e.occurrences.push({
          lesson: s.lesson,
          example: s.example,
          index: s.index,
        });
    }

  return [...map.values()].sort(compareEntries);
}

const DRILL_POS = { i: "形容詞", na: "形容動詞", noun: "名詞" } as const;

/** 처음 배운 강 차례(모르는 것은 뒤로), 같으면 읽기 차례 */
function compareEntries(a: DictEntry, b: DictEntry): number {
  const la = a.firstLesson ?? a.ilmuntaLesson ?? 999;
  const lb = b.firstLesson ?? b.ilmuntaLesson ?? 999;
  if (la !== lb) return la - lb;
  return (a.readings[0] ?? a.word).localeCompare(b.readings[0] ?? b.word, "ja");
}

/** 목록에 보일 요약(예문 자리는 빼고 화면에 보낸다) */
export type DictSummary = Omit<DictEntry, "occurrences"> & { count: number };

export function summarize(e: DictEntry): DictSummary {
  const { occurrences, ...rest } = e;
  return { ...rest, count: occurrences.length };
}
