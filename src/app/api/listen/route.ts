import { NextResponse } from "next/server";
import { z } from "zod";
import { rejectUnlessAdmin } from "@/lib/auth/server";
import { getDb } from "@/lib/store/db";
import {
  addListenEvents,
  listenEventSchema,
  summarizeListening,
} from "@/lib/store/listen";

const bodySchema = z.object({
  events: z.array(listenEventSchema).min(1).max(500),
});

export async function POST(request: Request) {
  const denied = await rejectUnlessAdmin();
  if (denied) return denied;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "형식이 맞지 않음" }, { status: 400 });
  return NextResponse.json({
    added: addListenEvents(getDb(), parsed.data.events),
  });
}

export async function GET(request: Request) {
  const book = listenEventSchema.shape.book.safeParse(
    new URL(request.url).searchParams.get("book"),
  );
  if (!book.success) {
    return NextResponse.json({ error: "book이 필요함" }, { status: 400 });
  }
  return NextResponse.json({ items: summarizeListening(getDb(), book.data) });
}
