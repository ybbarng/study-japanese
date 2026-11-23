import type { Example, IlmutaLesson, Sentence } from "@/lib/textbook/schema";

// 회화 코너(-4-1 Basic, -4-2 Advanced)를 말풍선 대본으로.

export type Side = "left" | "right";

/** 처음 말한 사람은 왼쪽, 다음 사람은 오른쪽, 그 뒤로는 번갈아 */
export function speakerSides(sentences: Sentence[]): Map<string, Side> {
  const sides = new Map<string, Side>();
  for (const s of sentences) {
    if (!s.speaker || sides.has(s.speaker)) continue;
    sides.set(s.speaker, sides.size % 2 === 0 ? "left" : "right");
  }
  return sides;
}

export interface Script {
  /** 같은 대본을 읽는 오디오들(Basic은 천천히·풀이, Advanced는 자연 속도) */
  examples: Example[];
  sentences: Sentence[];
}

function sameSentences(a: Sentence[], b: Sentence[]): boolean {
  return (
    a.length === b.length &&
    a.every((s, i) => s.ja === b[i].ja && s.speaker === b[i].speaker)
  );
}

/** 글이 있는 회화 예문을 대본별로 묶는다. Basic·Advanced 대본이 같으면 하나로 */
export function conversationScripts(lesson: IlmutaLesson): Script[] {
  const scripts: Script[] = [];
  for (const e of lesson.examples) {
    if (e.kind !== "conversationBasic" && e.kind !== "conversationAdvanced")
      continue;
    if (e.sentences.length === 0) continue;
    const same = scripts.find((s) => sameSentences(s.sentences, e.sentences));
    if (same) same.examples.push(e);
    else scripts.push({ examples: [e], sentences: e.sentences });
  }
  return scripts;
}
