import type { SongLine } from "./schema";
import type { Tokenize } from "./tokens";

// 가사 줄마다 낱말 조각(읽는 법·기본형·품사)을 붙인다. 화면에서 매번 분석하지 않게 저장해 둔다.
// - 관리자 브라우저(annotateLines): 저장 직전에 분석한다. 글이 그대로인 줄은 저장돼 있던 조각을
//   다시 쓰고, 분석기는 새 글이 있을 때만 띄운다(처음 띄울 때 사전을 받느라 무겁다).
// - 서버(keepStoredTokens): 분석하지 않는다. 조각 없이 온 줄(박자 맞추기·메모 저장)에
//   같은 글로 저장돼 있던 조각을 이어 붙이기만 한다.

/** 저장돼 있던 줄에서 글 → 조각 */
function storedTokens(previous: readonly SongLine[]) {
  const known = new Map<string, NonNullable<SongLine["tokens"]>>();
  for (const p of previous) if (p.tokens) known.set(p.ja, p.tokens);
  return known;
}

/** 브라우저: 줄마다 조각을 붙인다. 들어온 줄에 붙어 있던 조각은 믿지 않고 저장된 것이나 새 분석을 쓴다 */
export async function annotateLines(
  lines: readonly SongLine[],
  previous: readonly SongLine[],
  loadTokenize: () => Promise<Tokenize>,
): Promise<SongLine[]> {
  const known = storedTokens(previous);
  const missing = lines.some((l) => !known.has(l.ja));
  const tokenize = missing ? await loadTokenize() : null;
  return lines.map((line) => {
    const tokens = known.get(line.ja) ?? tokenize?.(line.ja) ?? [];
    known.set(line.ja, tokens);
    return { ...line, tokens };
  });
}

/** 서버: 조각 없이 온 줄에 같은 글의 저장된 조각을 붙인다. 없으면 조각 없이 둔다 */
export function keepStoredTokens(
  lines: readonly SongLine[],
  previous: readonly SongLine[],
): SongLine[] {
  const known = storedTokens(previous);
  return lines.map((line) => {
    if (line.tokens) return line;
    const tokens = known.get(line.ja);
    return tokens ? { ...line, tokens } : line;
  });
}
