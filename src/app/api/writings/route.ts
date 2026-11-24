import { NextResponse } from "next/server";
import { z } from "zod";
import { rejectUnlessAdmin } from "@/lib/auth/server";
import { getDb } from "@/lib/store/db";
import {
  getWriting,
  listWritings,
  putWriting,
  writingDocSchema,
} from "@/lib/store/writings";

const MAX_BYTES = 64 * 1024;
const bookSchema = writingDocSchema.shape.book;
const lessonSchema = z.coerce.number().int().min(0).max(200);

/** `?book=ilmuta` → 그 책 전부, `&lesson=1`까지 주면 그 강 하나 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const book = bookSchema.safeParse(params.get("book"));
  if (!book.success)
    return NextResponse.json({ error: "book이 필요함" }, { status: 400 });
  const lessonParam = params.get("lesson");
  if (lessonParam === null)
    return NextResponse.json({ items: listWritings(getDb(), book.data) });
  const lesson = lessonSchema.safeParse(lessonParam);
  if (!lesson.success)
    return NextResponse.json({ error: "잘못된 lesson" }, { status: 400 });
  return NextResponse.json({
    item: getWriting(getDb(), book.data, lesson.data),
  });
}

export async function PUT(request: Request) {
  const denied = await rejectUnlessAdmin();
  if (denied) return denied;
  const text = await request.text();
  if (text.length > MAX_BYTES)
    return NextResponse.json({ error: "너무 큼" }, { status: 413 });
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    // 아래 검사에서 400
  }
  const parsed = writingDocSchema.safeParse(json);
  if (!parsed.success)
    return NextResponse.json({ error: "형식이 맞지 않음" }, { status: 400 });
  return NextResponse.json(putWriting(getDb(), parsed.data));
}
