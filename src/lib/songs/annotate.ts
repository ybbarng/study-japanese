import type { SongLine, SongLineInput } from "./schema";
import type { Tokenize } from "./tokens";

// 저장할 때 가사 줄마다 낱말 조각(읽는 법·기본형·품사)을 붙인다. 화면에서 매번 분석하지 않게.
// 글이 그대로인 줄은 저장돼 있던 조각을 다시 쓰고, 분석기는 새 글이 있을 때만 띄운다
// (분석기는 처음 띄울 때 사전을 읽느라 무겁다).

export async function annotateLines(
  lines: readonly SongLineInput[],
  previous: readonly SongLine[],
  loadTokenize: () => Promise<Tokenize>,
): Promise<SongLine[]> {
  const known = new Map<string, NonNullable<SongLine["tokens"]>>();
  for (const p of previous) if (p.tokens) known.set(p.ja, p.tokens);
  const missing = lines.some((l) => !known.has(l.ja));
  const tokenize = missing ? await loadTokenize() : null;
  return lines.map((line) => {
    const tokens = known.get(line.ja) ?? tokenize?.(line.ja) ?? [];
    known.set(line.ja, tokens);
    return { ...line, tokens };
  });
}
