import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/store/db";
import { getState, putState } from "@/lib/store/state";

const KEY = /^[a-z0-9][a-z0-9-]{0,40}$/;
const MAX_BYTES = 512 * 1024;
const bodySchema = z.object({
  value: z.unknown(),
  updatedAt: z.number().int().positive(),
});

export async function GET(
  _: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  if (!KEY.test(key))
    return NextResponse.json({ error: "잘못된 키" }, { status: 400 });
  return NextResponse.json(getState(getDb(), key));
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  if (!KEY.test(key))
    return NextResponse.json({ error: "잘못된 키" }, { status: 400 });
  // 사이트 설정은 검증하는 전용 경로(/api/settings)로만 바꾼다
  if (key === "site-settings")
    return NextResponse.json(
      { error: "/api/settings를 쓰세요" },
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
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success)
    return NextResponse.json({ error: "형식이 맞지 않음" }, { status: 400 });
  return NextResponse.json(
    putState(getDb(), {
      key,
      value: parsed.data.value,
      updatedAt: parsed.data.updatedAt,
    }),
  );
}
