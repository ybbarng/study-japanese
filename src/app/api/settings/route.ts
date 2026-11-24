import { NextResponse } from "next/server";
import { z } from "zod";
import { rejectUnlessAdmin } from "@/lib/auth/server";
import { readSiteSettings, writeSiteSettings } from "@/lib/sources/settings";
import { getDb } from "@/lib/store/db";

// 사이트 설정(출처별 공개 여부). 바꾸기는 관리자만(src/proxy.ts가 쓰기 요청을 막는다).
const bodySchema = z.object({ closedSources: z.array(z.string()).max(100) });

export async function GET() {
  return NextResponse.json(readSiteSettings(getDb()));
}

export async function PUT(request: Request) {
  const denied = await rejectUnlessAdmin();
  if (denied) return denied;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "형식이 맞지 않음" }, { status: 400 });
  return NextResponse.json(writeSiteSettings(getDb(), parsed.data, Date.now()));
}
