import type { WritingDoc } from "@/lib/store/writings";

// 문장 쓰기 칸의 처음 값과 보낼 문서. 저장하기 전에 쓴 글은 폰(localStorage)에 초안으로 둔다.

export interface Draft {
  texts: string[];
  updatedAt: number;
}

export function draftKey(lesson: number): string {
  return `sj-writing-ilmuta-${lesson}`;
}

function pad(texts: string[], n: number): string[] {
  return Array.from(
    { length: Math.max(n, texts.length) },
    (_, i) => texts[i] ?? "",
  );
}

/** 서버 문서보다 늦게 고친 초안이 있으면 초안을, 아니면 서버 글을 칸에 채운다 */
export function initialTexts(
  server: WritingDoc | null,
  draft: Draft | null,
  slots = 3,
): { texts: string[]; fromDraft: boolean } {
  if (draft && (!server || draft.updatedAt > server.updatedAt))
    return { texts: pad(draft.texts, slots), fromDraft: true };
  return {
    texts: pad(server?.sentences.map((s) => s.text) ?? [], slots),
    fromDraft: false,
  };
}

/** PUT /api/writings 본문. 고친 말은 보내지 않는다(서버가 글이 그대로인 문장의 고친 말을 지킨다) */
export function toWritingDoc(
  lesson: number,
  texts: string[],
  now: number,
): WritingDoc {
  return {
    book: "ilmuta",
    lesson,
    sentences: texts.map((t) => ({ text: t.trim() })),
    updatedAt: now,
  };
}

export function parseDraft(raw: string | null): Draft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    return Array.isArray(d?.texts) && typeof d?.updatedAt === "number"
      ? { texts: d.texts.map(String), updatedAt: d.updatedAt }
      : null;
  } catch {
    return null;
  }
}
