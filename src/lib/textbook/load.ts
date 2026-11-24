import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { z } from "zod";
import { type Transcript, transcriptSchema } from "@/lib/context/card-schema";
import { type Ilmuta, ilmutaSchema } from "./schema";

// 교재 JSON은 이미지에 넣지 않고 실행할 때 CONTENT_DIR(기본 <cwd>/content)에서 읽는다.
// 파일이 바뀌면(mtime) 다시 읽고, 그대로면 검증한 결과를 그대로 쓴다.

export function contentDir(): string {
  return process.env.CONTENT_DIR ?? path.join(process.cwd(), "content");
}

const cache = new Map<string, { mtimeMs: number; data: unknown }>();

/** 없으면 null. 있는데 모양이 틀리면 던진다(데이터를 고쳐야 하므로). */
export function readJson<T>(file: string, schema: z.ZodType<T>): T | null {
  let mtimeMs: number;
  try {
    mtimeMs = statSync(file).mtimeMs;
  } catch {
    cache.delete(file);
    return null;
  }
  const hit = cache.get(file);
  if (hit && hit.mtimeMs === mtimeMs) return hit.data as T;
  const data = schema.parse(JSON.parse(readFileSync(file, "utf8")));
  cache.set(file, { mtimeMs, data });
  return data;
}

export function loadIlmuta(dir: string = contentDir()): Ilmuta | null {
  return readJson(path.join(dir, "textbook", "ilmuta.json"), ilmutaSchema);
}

const TRANSCRIPT_BOOKS = new Set(["ilmuta", "ilmunta"]);
/**
 * 오디오 항목 이름(L01, 01-4-1, L01-01, 나뉜 강의 L26-02-02-_1_ …). 경로 조각으로 쓰므로 이 모양만 받는다.
 * 점·슬래시는 받지 않아 폴더 밖으로 나가지 못한다
 */
const ITEM = /^[A-Za-z0-9][A-Za-z0-9_-]{0,23}$/;

/** 오디오 자막(`transcripts/<book>/<item>.json`). 없거나 깨졌거나 이름이 틀리면 조용히 null */
export function loadTranscript(
  book: string,
  item: string,
  dir: string = contentDir(),
): Transcript | null {
  if (!TRANSCRIPT_BOOKS.has(book) || !ITEM.test(item)) return null;
  try {
    return readJson(
      path.join(dir, "transcripts", book, `${item}.json`),
      transcriptSchema,
    );
  } catch {
    return null;
  }
}

/** 일무따 강의 자막(`transcripts/ilmuta/L01.json`) */
export function loadIlmutaTranscript(
  item: string,
  dir: string = contentDir(),
): Transcript | null {
  if (!/^L\d{2}$/.test(item)) return null;
  return loadTranscript("ilmuta", item, dir);
}
