import type { Example, Pattern, Sentence } from "@/lib/textbook/schema";

export interface PatternGroup {
  /** 문형 머리. 어느 문형에도 속하지 않은 예문 묶음이면 null */
  head: Pattern | null;
  sentences: Sentence[];
}

/** 문형 머리 차례대로 그 문형의 예문을 모은다. 짝 없는 예문은 맨 뒤에 한 묶음으로 */
export function groupByPattern(example: Example): PatternGroup[] {
  const heads = example.patterns ?? [];
  const groups: PatternGroup[] = heads.map((p) => ({
    head: p,
    sentences: example.sentences.filter((s) => s.pattern === p.no),
  }));
  const loose = example.sentences.filter(
    (s) => !heads.some((p) => p.no === s.pattern),
  );
  if (loose.length > 0) groups.push({ head: null, sentences: loose });
  return groups;
}
