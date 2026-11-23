import { NextResponse } from "next/server";
import { loadContextTranscript, visibleBooks } from "@/lib/context/server";
import { sourceOfBook } from "@/lib/sources/registry";

// 재생 화면이 지금 트랙의 자막(과 맞춘 소책자 문장·낱말 카드)을 받아 간다.
// 자막은 남의 자료에서 나온 글이라 출처 공개 여부를 따른다.
export async function GET(
  _: Request,
  { params }: { params: Promise<{ book: string; item: string }> },
) {
  const { book, item } = await params;
  const canSee = await visibleBooks();
  if (!sourceOfBook(book) || !canSee(book))
    return NextResponse.json(null, { status: 403 });
  const transcript = loadContextTranscript(book, item, canSee);
  if (!transcript) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(transcript, {
    headers: { "Cache-Control": "private, max-age=3600" },
  });
}
