import type { Example } from "./schema";

/** 오디오 파일 이름을 강·과 단위로 나눈다. */

export type ExampleFile = {
  id: string;
  lesson: number;
  kind: Example["kind"];
  name: string;
};

/** 확장자를 떼고 숫자 차례로 비교한다(`L26-02.MP3`가 `L26-02-01.MP3`보다 앞) */
function byName(a: { name: string }, b: { name: string }): number {
  const base = (n: string) => n.replace(/\.[^.]+$/, "");
  return base(a.name).localeCompare(base(b.name), "en", { numeric: true });
}

/** 일무따 강의: `L00.mp3` … `L60.mp3` */
export function ilmutaLectureFiles(names: string[]): Map<number, string> {
  const out = new Map<number, string>();
  for (const name of names) {
    const m = name.match(/^L(\d{2})\.mp3$/i);
    if (m) out.set(Number(m[1]), name);
  }
  return out;
}

const ILMUTA_KIND: Record<string, Example["kind"]> = {
  "1": "dialogue",
  "2": "words",
  "3": "patterns",
  "4-1": "conversationBasic",
  "4-2": "conversationAdvanced",
  "5": "exercise",
  "6": "longReading",
};

/** 일무따 예문: `01-1.mp3`, `01-4-2.mp3`, `40-6.mp3` */
export function ilmutaExampleFiles(names: string[]): ExampleFile[] {
  const out: ExampleFile[] = [];
  for (const name of names) {
    const m = name.match(/^((\d{2})-(\d(?:-\d)?))\.mp3$/i);
    if (!m) continue;
    out.push({
      id: m[1],
      lesson: Number(m[2]),
      kind: ILMUTA_KIND[m[3]] ?? "unknown",
      name,
    });
  }
  return out.sort(byName);
}

/** 일문따 강의: `L01-01.MP3`, `L08-03-01.MP3`, `L26-02-02-_1_.MP3` */
export function ilmuntaLectureFiles(names: string[]): Map<number, string[]> {
  const out = new Map<number, string[]>();
  for (const name of [...names].sort((a, b) =>
    byName({ name: a }, { name: b }),
  )) {
    const m = name.match(/^L(\d{2})-.+\.mp3$/i);
    if (!m) continue;
    const no = Number(m[1]);
    out.set(no, [...(out.get(no) ?? []), name]);
  }
  return out;
}

/** 일문따 예문: `01-1.MP3`(문법 예문), `01-2.MP3`(읽기 글) */
export function ilmuntaExampleFiles(names: string[]): ExampleFile[] {
  const out: ExampleFile[] = [];
  for (const name of names) {
    const m = name.match(/^((\d{2})-(\d))\.mp3$/i);
    if (!m) continue;
    const kind: Example["kind"] =
      m[3] === "1" ? "grammarExamples" : m[3] === "2" ? "reading" : "unknown";
    out.push({ id: m[1], lesson: Number(m[2]), kind, name });
  }
  return out.sort(byName);
}
