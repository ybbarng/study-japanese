import { NextResponse } from "next/server";
import { visibleBooks } from "@/lib/context/server";
import { loadIlmunta } from "@/lib/ilmunta/load";
import { fullIlmuntaPack, fullIlmutaPack } from "@/lib/offline/server-pack";
import { loadIlmuta } from "@/lib/textbook/load";

// "이 강 받아 두기"를 누르면 부른다: 강 하나를 끊긴 곳에서 온전히 쓰는 데 필요한 파일 목록
// (오디오·강 화면·자막 API·그림). 자막은 출처 공개 여부를 따른다(볼 수 없으면 목록에서 빠진다).
export async function GET(
  _: Request,
  { params }: { params: Promise<{ book: string; no: string }> },
) {
  const { book, no: raw } = await params;
  if (!/^\d{1,2}$/.test(raw)) return NextResponse.json(null, { status: 404 });
  const no = Number(raw);
  const canSee = await visibleBooks();

  if (book === "ilmuta") {
    const data = loadIlmuta();
    const lesson = data?.lessons.find((l) => l.no === no);
    if (!data || !lesson) return NextResponse.json(null, { status: 404 });
    return NextResponse.json(fullIlmutaPack(lesson, data.lessons, canSee), {
      headers: { "Cache-Control": "private, no-store" },
    });
  }
  if (book === "ilmunta") {
    const lesson = loadIlmunta()?.lessons.find((l) => l.no === no);
    if (!lesson) return NextResponse.json(null, { status: 404 });
    return NextResponse.json(fullIlmuntaPack(lesson, canSee), {
      headers: { "Cache-Control": "private, no-store" },
    });
  }
  return NextResponse.json(null, { status: 404 });
}
