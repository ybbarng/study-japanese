import { type CardId, cardId, type Script } from "@/lib/kana/data";
import type { Mark } from "@/lib/kana/text";
import type { Piece } from "./pieces";

// 배운 글자만으로 읽을 수 있는지. 한자는 후리가나가 붙어 있고 그 읽는 법을 읽을 수 있을 때만 통과.

export interface Learned {
  cards: ReadonlySet<CardId>;
  marks: Record<Script, ReadonlySet<Mark>>;
}

function pieceReadable(p: Piece, learned: Learned): boolean {
  switch (p.kind) {
    case "kana":
      return learned.cards.has(cardId(p.script, p.soundId));
    case "mark":
      return learned.marks[p.script].has(p.mark);
    case "kanji":
      return (
        p.units.length > 0 && p.units.every((u) => pieceReadable(u, learned))
      );
    case "punct":
      return true;
    case "unknown":
      return false;
  }
}

/** 모든 조각을 읽을 수 있고, 가나·한자가 하나라도 있으면 참 */
export function isReadable(
  pieces: readonly Piece[],
  learned: Learned,
): boolean {
  const hasText = pieces.some((p) => p.kind !== "punct");
  return hasText && pieces.every((p) => pieceReadable(p, learned));
}

/** 소리 내어 읽는 박 수(가나·표시, 한자는 읽는 법의 박 수) */
export function moraCount(pieces: readonly Piece[]): number {
  let n = 0;
  for (const p of pieces) {
    if (p.kind === "kana" || p.kind === "mark") n += 1;
    else if (p.kind === "kanji") n += moraCount(p.units);
  }
  return n;
}
