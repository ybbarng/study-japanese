import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";

// 강마다 쓴 일본어 문장(주말에 그 강 문형으로 3개). 세션이 export로 읽고,
// 고친 문장(correction)과 한마디(note)를 같은 PUT으로 달아 준다.
// 기기가 여럿이라 updatedAt이 더 늦은 쪽만 들어간다.

export const writingSentenceSchema = z.object({
  text: z.string().max(500),
  /** 세션이 고친 문장 */
  correction: z.string().max(500).optional(),
  /** 세션이 남긴 설명 */
  note: z.string().max(2000).optional(),
});
export type WritingSentence = z.infer<typeof writingSentenceSchema>;

export const writingDocSchema = z.object({
  book: z.enum(["ilmuta", "ilmunta"]),
  lesson: z.number().int().min(0).max(200),
  sentences: z.array(writingSentenceSchema).max(10),
  updatedAt: z.number().int().positive(),
});
export type WritingDoc = z.infer<typeof writingDocSchema>;

/** 강 하나에 써야 하는 문장 수 */
export const SENTENCES_PER_LESSON = 3;

export function countWritten(
  doc: Pick<WritingDoc, "sentences"> | null,
): number {
  return doc ? doc.sentences.filter((s) => s.text.trim() !== "").length : 0;
}

/**
 * 들어온 문서에 고친 말이 없으면, 글이 그대로인 문장에 한해 저장된 고친 말을 이어 둔다.
 * 사용자가 문장을 바꾸면 그 문장의 옛 고친 말은 버린다(더는 맞지 않으므로).
 */
export function mergeCorrections(
  stored: WritingDoc | null,
  incoming: WritingDoc,
): WritingDoc {
  return {
    ...incoming,
    sentences: incoming.sentences.map((s, i) => {
      if (s.correction !== undefined || s.note !== undefined) return s;
      const old = stored?.sentences[i];
      if (!old || old.text !== s.text) return { text: s.text };
      const kept: WritingSentence = { text: s.text };
      if (old.correction !== undefined) kept.correction = old.correction;
      if (old.note !== undefined) kept.note = old.note;
      return kept;
    }),
  };
}

type Row = {
  book: string;
  lesson: number;
  sentences: string;
  updated_at: number;
};

function fromRow(r: Row): WritingDoc {
  return {
    book: r.book as WritingDoc["book"],
    lesson: Number(r.lesson),
    sentences: JSON.parse(r.sentences),
    updatedAt: Number(r.updated_at),
  };
}

export function getWriting(
  db: DatabaseSync,
  book: WritingDoc["book"],
  lesson: number,
): WritingDoc | null {
  const row = db
    .prepare(
      "SELECT book, lesson, sentences, updated_at FROM writings WHERE book = ? AND lesson = ?",
    )
    .get(book, lesson) as Row | undefined;
  return row ? fromRow(row) : null;
}

/** 책을 주면 그 책만, 아니면 전부 */
export function listWritings(
  db: DatabaseSync,
  book?: WritingDoc["book"],
): WritingDoc[] {
  const rows = (
    book
      ? db
          .prepare(
            "SELECT book, lesson, sentences, updated_at FROM writings WHERE book = ? ORDER BY lesson",
          )
          .all(book)
      : db
          .prepare(
            "SELECT book, lesson, sentences, updated_at FROM writings ORDER BY book, lesson",
          )
          .all()
  ) as Row[];
  return rows.map(fromRow);
}

/** 저장된 것보다 늦을 때만 바꾼다. 결과로 지금 저장된 문서를 돌려준다. */
export function putWriting(
  db: DatabaseSync,
  doc: WritingDoc,
): { applied: boolean; current: WritingDoc } {
  const stored = getWriting(db, doc.book, doc.lesson);
  if (stored && stored.updatedAt >= doc.updatedAt)
    return { applied: false, current: stored };
  const merged = mergeCorrections(stored, doc);
  db.prepare(
    `INSERT INTO writings (book, lesson, sentences, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(book, lesson) DO UPDATE SET sentences = excluded.sentences, updated_at = excluded.updated_at`,
  ).run(
    merged.book,
    merged.lesson,
    JSON.stringify(merged.sentences),
    merged.updatedAt,
  );
  return { applied: true, current: merged };
}
