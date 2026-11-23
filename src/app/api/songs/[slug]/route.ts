import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth/server";
import { keepStoredTokens } from "@/lib/songs/annotate";
import { canSeeLyrics, isSlug, songInputSchema } from "@/lib/songs/schema";
import { getDb } from "@/lib/store/db";
import { deleteSong, getSong, putSong } from "@/lib/store/songs";

// 노래 한 곡. 읽기는 가사를 공개했으면 누구나, 아니면 관리자만.
// 넣기·고치기·지우기는 관리자만(proxy.ts가 먼저 막고, 여기서도 다시 본다).

// 낱말 조각까지 실은 본문. 보통 노래(50줄 안팎)는 50KB쯤이고, 300줄을 꽉 채워도 넘지 않을 만큼
const MAX_BYTES = 1024 * 1024;

type Params = { params: Promise<{ slug: string }> };

const notFound = () => NextResponse.json({ error: "없음" }, { status: 404 });
const forbidden = () =>
  NextResponse.json(
    { error: "로그인한 사람만 할 수 있습니다" },
    { status: 401 },
  );

export async function GET(_: Request, { params }: Params) {
  const { slug } = await params;
  if (!isSlug(slug)) return notFound();
  const song = getSong(getDb(), slug);
  // 공개하지 않은 노래는 있는지도 알리지 않는다
  if (!song || !canSeeLyrics(song, await isAdminRequest())) return notFound();
  return NextResponse.json({ item: song });
}

/** 넣거나 고친다. `If-None-Match: *`이면 새로 넣을 때만(같은 이름이 있으면 409) */
export async function PUT(request: Request, { params }: Params) {
  if (!(await isAdminRequest())) return forbidden();
  const { slug } = await params;
  if (!isSlug(slug))
    return NextResponse.json(
      { error: "주소 이름이 맞지 않음" },
      { status: 400 },
    );
  const text = await request.text();
  if (text.length > MAX_BYTES)
    return NextResponse.json({ error: "너무 큼" }, { status: 413 });
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    // 아래 검사에서 400
  }
  const parsed = songInputSchema.safeParse(json);
  if (!parsed.success)
    return NextResponse.json({ error: "형식이 맞지 않음" }, { status: 400 });

  const db = getDb();
  const stored = getSong(db, slug);
  if (stored && request.headers.get("if-none-match") === "*")
    return NextResponse.json(
      { error: "같은 주소 이름의 노래가 있음" },
      { status: 409 },
    );
  // 낱말 조각은 관리자 브라우저가 분석해 보낸다. 서버는 모양만 확인하고(songInputSchema)
  // 조각 없이 온 줄에 저장돼 있던 조각을 이어 붙인다
  const lines = keepStoredTokens(parsed.data.lines, stored?.lines ?? []);
  const song = putSong(db, slug, { ...parsed.data, lines }, Date.now());
  return NextResponse.json({ item: song });
}

export async function DELETE(_: Request, { params }: Params) {
  if (!(await isAdminRequest())) return forbidden();
  const { slug } = await params;
  if (!isSlug(slug) || !deleteSong(getDb(), slug)) return notFound();
  return NextResponse.json({ deleted: slug });
}
