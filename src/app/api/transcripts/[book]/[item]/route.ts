import { NextResponse } from "next/server";
import { loadTranscript } from "@/lib/textbook/load";

// 재생 화면이 지금 트랙의 자막을 받아 간다. 교재에서 나온 글이라 로그인 뒤에만(proxy).
export async function GET(
  _: Request,
  { params }: { params: Promise<{ book: string; item: string }> },
) {
  const { book, item } = await params;
  const transcript = loadTranscript(book, item);
  if (!transcript) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(transcript, {
    headers: { "Cache-Control": "private, max-age=3600" },
  });
}
