import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth/server";
import { canSeeSource, sourceOfBook } from "@/lib/sources/registry";
import { readSiteSettings } from "@/lib/sources/settings";
import { getDb } from "@/lib/store/db";
import { loadTranscript } from "@/lib/textbook/load";

// 재생 화면이 지금 트랙의 자막을 받아 간다. 자막은 남의 자료에서 나온 글이라 출처 공개 여부를 따른다.
export async function GET(
  _: Request,
  { params }: { params: Promise<{ book: string; item: string }> },
) {
  const { book, item } = await params;
  const visible = canSeeSource(
    sourceOfBook(book),
    await isAdminRequest(),
    readSiteSettings(getDb()),
  );
  if (!visible) return NextResponse.json(null, { status: 403 });
  const transcript = loadTranscript(book, item);
  if (!transcript) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(transcript, {
    headers: { "Cache-Control": "private, max-age=3600" },
  });
}
