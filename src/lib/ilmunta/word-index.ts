/**
 * 드릴 낱말이 교재에서 처음 나오는 과를 찾는 순수 함수들(scripts/ilmunta/word-lessons.ts가 쓴다).
 * 일문따 단어 색인(xlsx)은 낱말마다 처음 나오는 쪽을 적어 두었으므로, 쪽을 과로 바꾼다.
 * 결과(낱말 → 과 번호)만 저장소에 두고, 교재 글은 옮기지 않는다.
 */

/** 색인 한 줄: 쪽(들), 읽기, 표기(없으면 빈 글), 뜻 */
export interface IndexEntry {
  pages: number[];
  reading: string;
  kanji: string;
}

const decode = (s: string) =>
  s
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");

/** xlsx의 sharedStrings.xml → 글 목록(서식이 나뉜 글은 이어 붙인다) */
export function parseSharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    [...m[1].matchAll(/<t(?:\s[^>]*)?>([^<]*)<\/t>/g)]
      .map((t) => decode(t[1]))
      .join(""),
  );
}

/** xlsx의 시트 XML → 줄마다 {열 이름: 값} */
export function parseSheetRows(
  xml: string,
  strings: readonly string[],
): Record<string, string>[] {
  return [...xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((row) => {
    const out: Record<string, string> = {};
    for (const c of row[1].matchAll(
      /<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g,
    )) {
      const v = /<v>([^<]*)<\/v>/.exec(c[3] ?? "")?.[1];
      if (v == null) continue;
      out[c[1]] = /\bt="s"/.test(c[2]) ? (strings[Number(v)] ?? "") : decode(v);
    }
    return out;
  });
}

/** 쪽 칸 글("059", "44, 84, 362~368")에서 쪽 번호들. 물결 범위는 첫 쪽만 */
export function parsePages(cell: string): number[] {
  return [...cell.matchAll(/\d+/g)]
    .filter((m) => cell[(m.index ?? 0) - 1] !== "~")
    .map((m) => Number(m[0]));
}

/** 색인 줄(A 쪽, B 읽기, C 표기) → 항목. 쪽이 없는 머리줄은 건너뛴다 */
export function toEntries(rows: Record<string, string>[]): IndexEntry[] {
  return rows.flatMap((r) => {
    const pages = parsePages(r.A ?? "");
    if (pages.length === 0 || !r.B) return [];
    return [{ pages, reading: r.B.trim(), kanji: (r.C ?? "").trim() }];
  });
}

export interface LessonPages {
  no: number;
  from: number;
  to: number;
}

/**
 * 쪽 → 과. 과와 과 사이 쪽(마당 첫머리)은 뒤 과로 본다. 준비마당 쪽과 1과 앞은 0.
 * 마지막 과 뒤(부록)는 null.
 */
export function lessonOfPage(
  page: number,
  lessons: readonly LessonPages[],
): number | null {
  const sorted = [...lessons].sort((a, b) => a.from - b.from);
  for (const l of sorted) {
    if (page < l.from) return l.no === sorted[0].no ? 0 : l.no;
    if (page <= l.to) return l.no;
  }
  return null;
}

/** 드릴 낱말(사전형·읽기) */
export interface DrillWord {
  dict: string;
  reading: string;
}

const KANJI = /\p{Script=Han}/gu;
const stripParen = (s: string) => s.replace(/[(（].*?[)）]/g, "").trim();

/** 색인에서 이 낱말을 찾는 방법들(앞의 것일수록 확실하다) */
function lookupKeys(w: DrillWord): { dict: string; reading: string }[] {
  const keys = [w];
  // 静か → 静かな(형용동사는 な를 붙여 싣는다)
  keys.push({ dict: `${w.dict}な`, reading: `${w.reading}な` });
  // 勉強する → 勉強(명사로 실린다)
  if (w.dict.endsWith("する") && w.dict !== "する")
    keys.push({ dict: w.dict.slice(0, -2), reading: w.reading.slice(0, -2) });
  // 持って来る → 持ってくる
  if (w.dict.endsWith("来る") && w.dict !== "来る")
    keys.push({ dict: `${w.dict.slice(0, -2)}くる`, reading: w.reading });
  return keys;
}

export interface IndexMatch {
  how: "exact" | "variant" | "kana" | "fuzzy";
  entry: IndexEntry;
}

/**
 * 색인에서 낱말을 찾는다.
 * - exact: 표기가 같다(표기가 없는 항목은 읽기가 같다)
 * - variant: 静か → 静かな, 勉強する → 勉強처럼 실린 꼴을 바꿔 찾았다
 * - kana: 색인이 가나로만 실었고 읽기가 같다(分かる ↔ わかる)
 * - fuzzy: 읽기가 같고 한자가 하나 이상 겹친다(子ども ↔ 子供). 사람이 확인할 것
 * 여러 항목이 맞으면 가장 앞 쪽을 고른다.
 */
export function findInIndex(
  w: DrillWord,
  entries: readonly IndexEntry[],
): IndexMatch | null {
  const earliest = (list: IndexEntry[]) =>
    list.sort((a, b) => Math.min(...a.pages) - Math.min(...b.pages))[0];
  const keys = lookupKeys(w);
  for (const [i, k] of keys.entries()) {
    const hits = entries.filter(
      (e) =>
        stripParen(e.kanji) === k.dict ||
        (e.kanji === "" && stripParen(e.reading) === k.dict),
    );
    if (hits.length > 0)
      return { how: i === 0 ? "exact" : "variant", entry: earliest(hits) };
  }
  for (const k of keys) {
    const hits = entries.filter(
      (e) => e.kanji === "" && stripParen(e.reading) === k.reading,
    );
    if (hits.length > 0) return { how: "kana", entry: earliest(hits) };
  }
  const kanji = new Set(w.dict.match(KANJI) ?? []);
  if (kanji.size === 0) return null;
  const fuzzy = entries.filter(
    (e) =>
      stripParen(e.reading) === w.reading &&
      (e.kanji.match(KANJI) ?? []).some((k) => kanji.has(k)),
  );
  return fuzzy.length > 0 ? { how: "fuzzy", entry: earliest(fuzzy) } : null;
}

/** 일무따 강 하나의 낱말 목록과 문장(문장 속 활용형으로도 찾는다) */
export interface IlmutaLesson {
  no: number;
  words: { ja: string; reading?: string }[];
  texts: string[];
}

/**
 * 일무따에서 이 낱말이 처음 나오는 강.
 * 강의 낱말 목록에 있거나, 문장에 `forms`(사전형·ます형 줄기·て형 같은 활용형 표기) 가운데 하나가 들어 있으면 나온 것으로 본다.
 * 가나뿐인 짧은 꼴(2글자 이하: いる·いい)은 다른 낱말 속에도 흔히 들어 있어 문장 검색에 쓰지 않는다.
 * 한 글자짜리 활용 줄기(出る의 出)도 마찬가지라 `forms`에 넣지 않는다(부르는 쪽 몫).
 */
export function firstIlmutaLesson(
  w: DrillWord,
  forms: readonly string[],
  lessons: readonly IlmutaLesson[],
): number | null {
  const searchable = forms.filter(
    (f) => (f.match(KANJI) ?? []).length > 0 || [...f].length > 2,
  );
  for (const l of [...lessons].sort((a, b) => a.no - b.no)) {
    if (l.words.some((x) => x.ja === w.dict || x.reading === w.dict))
      return l.no;
    if (l.texts.some((t) => searchable.some((f) => t.includes(f)))) return l.no;
  }
  return null;
}
