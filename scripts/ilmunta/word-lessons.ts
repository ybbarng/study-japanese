/**
 * 드릴 낱말(verbs.ts·words.ts)마다 교재에서 처음 나오는 과·강을 찾는다.
 *
 *   pnpm ilmunta:word-lessons            # 찾은 결과를 알리고, src/lib/ilmunta/word-lessons.ts에 넣을 글을 표준 출력으로
 *   pnpm ilmunta:word-lessons --check    # 저장소의 word-lessons.ts가 지금 찾은 결과와 같은지 확인(다르면 1로 끝남)
 *
 * 읽는 것(모두 git 밖, 읽기만 한다):
 * - 일문따 단어 색인: <일문따 폴더>/2_단어_색인.xlsx — 낱말마다 처음 나오는 쪽. 쪽은 content/textbook/ilmunta.json의 과별 쪽 범위로 과로 바꾼다
 * - 일무따: content/textbook/ilmuta.json — 강별 낱말 목록과 문장
 * 폴더는 --ilmunta·--textbook 또는 ILMUNTA_DIR·TEXTBOOK_OUT_DIR로 바꿀 수 있다.
 * 결과에는 낱말과 과·강 번호만 남는다(교재 글은 옮기지 않는다). 필요한 도구: unzip.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { conjugateAdj } from "@/lib/ilmunta/adjective";
import { conjugate } from "@/lib/ilmunta/conjugate";
import { VERBS } from "@/lib/ilmunta/verbs";
import {
  type DrillWord,
  findInIndex,
  firstIlmutaLesson,
  type IlmutaLesson,
  lessonOfPage,
  parseSharedStrings,
  parseSheetRows,
  toEntries,
} from "@/lib/ilmunta/word-index";
import { WORD_LESSONS, type WordLesson } from "@/lib/ilmunta/word-lessons";
import { ADJECTIVES } from "@/lib/ilmunta/words";

const { values } = parseArgs({
  options: {
    ilmunta: { type: "string" },
    textbook: { type: "string" },
    check: { type: "boolean", default: false },
  },
});

const ilmuntaDir =
  values.ilmunta ??
  process.env.ILMUNTA_DIR ??
  path.join(homedir(), "personal/study/japanese/BN003602_total");
const textbookDir =
  values.textbook ??
  process.env.TEXTBOOK_OUT_DIR ??
  path.resolve(import.meta.dirname, "../../content/textbook");

function unzipText(file: string, inner: string): string {
  return execFileSync("unzip", ["-p", file, inner], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

// 일문따 색인
const xlsx = path.join(ilmuntaDir, "2_단어_색인.xlsx");
const entries = toEntries(
  parseSheetRows(
    unzipText(xlsx, "xl/worksheets/sheet1.xml"),
    parseSharedStrings(unzipText(xlsx, "xl/sharedStrings.xml")),
  ),
);
const ilmunta = JSON.parse(
  readFileSync(path.join(textbookDir, "ilmunta.json"), "utf8"),
) as { lessons: { no: number; pages: { from: number; to: number } }[] };
const lessonPages = ilmunta.lessons.map((l) => ({ no: l.no, ...l.pages }));

// 일무따
type IlmutaJson = {
  lessons: {
    no: number;
    examples: {
      kind: string;
      sentences: { ja: string; reading?: string }[];
    }[];
  }[];
};
const ilmuta = JSON.parse(
  readFileSync(path.join(textbookDir, "ilmuta.json"), "utf8"),
) as IlmutaJson;
const ilmutaLessons: IlmutaLesson[] = ilmuta.lessons.map((l) => ({
  no: l.no,
  words: l.examples
    .filter((e) => e.kind === "words")
    .flatMap((e) => e.sentences),
  texts: l.examples
    .filter((e) => e.kind !== "words")
    .flatMap((e) => e.sentences.map((s) => s.ja)),
}));

/** 문장 검색에 쓸 활용형 표기 */
function formsOf(dict: string): string[] {
  const v = VERBS.find((x) => x.dict === dict);
  if (v) {
    const fs = (["dict", "te", "ta", "nai"] as const).map(
      (f) => conjugate(v, f).kanji,
    );
    // ます 줄기가 한 글자(出る → 出)면 다른 낱말 속에도 흔해서 뺀다
    const stem = conjugate(v, "masu").kanji.replace(/ます$/, "");
    return [...stem].length >= 2 ? [...fs, stem] : fs;
  }
  const a = ADJECTIVES.find((x) => x.dict === dict);
  if (a?.kind === "i")
    return [
      a.dict,
      conjugateAdj(a, "te").kanji,
      conjugateAdj(a, "plainPast").kanji,
    ];
  return [dict];
}

const words: DrillWord[] = [
  ...VERBS.map((v) => ({ dict: v.dict, reading: v.reading })),
  ...ADJECTIVES.map((a) => ({ dict: a.dict, reading: a.reading })),
];

const found: Record<string, WordLesson> = {};
const notes: string[] = [];
for (const w of words) {
  const m = findInIndex(w, entries);
  const page = m ? Math.min(...m.entry.pages) : null;
  const lesson = page == null ? null : lessonOfPage(page, lessonPages);
  const first = firstIlmutaLesson(w, formsOf(w.dict), ilmutaLessons);
  const r: WordLesson = {};
  if (lesson != null) r.ilmunta = lesson;
  if (first != null) r.ilmuta = first;
  found[w.dict] = r;
  if (m && m.how !== "exact")
    notes.push(
      `${w.dict}: 색인에서 ${m.how}로 찾음(${m.entry.kanji || m.entry.reading})`,
    );
  if (m && lesson == null)
    notes.push(`${w.dict}: 색인 쪽 ${page}이 과 범위 밖`);
}

const total = words.length;
const inIlmunta = words.filter((w) => found[w.dict].ilmunta != null).length;
const inIlmuta = words.filter((w) => found[w.dict].ilmuta != null).length;
const none = words.filter(
  (w) => found[w.dict].ilmunta == null && found[w.dict].ilmuta == null,
);
console.error(
  [
    `낱말 ${total}개 · 일문따 색인에서 과를 찾음 ${inIlmunta} · 일무따에 나옴 ${inIlmuta} · 둘 다 없음 ${none.length}`,
    none.length ? `둘 다 없음: ${none.map((w) => w.dict).join(" ")}` : "",
    ...notes,
  ]
    .filter(Boolean)
    .join("\n"),
);

if (values.check) {
  const diff = words.filter(
    (w) =>
      JSON.stringify(found[w.dict]) !==
      JSON.stringify(WORD_LESSONS[w.dict] ?? null),
  );
  if (diff.length > 0) {
    console.error(
      `word-lessons.ts와 다름: ${diff.map((w) => w.dict).join(" ")}`,
    );
    process.exit(1);
  }
  console.error("word-lessons.ts가 찾은 결과와 같다");
} else {
  const lines = words.map((w) => {
    const r = found[w.dict];
    const parts = [
      r.ilmunta != null ? `ilmunta: ${r.ilmunta}` : "",
      r.ilmuta != null ? `ilmuta: ${r.ilmuta}` : "",
    ].filter(Boolean);
    // 낱말은 모두 JS 이름으로 쓸 수 있는 글자라 따옴표 없이 낸다(biome 형식과 같게)
    return `  ${w.dict}: {${parts.length ? ` ${parts.join(", ")} ` : ""}},`;
  });
  console.log(lines.join("\n"));
}
