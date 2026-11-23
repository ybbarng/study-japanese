import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { z } from "zod";
import { type Transcript, transcriptSchema } from "@/lib/ilmuta/context-cues";
import { type Ilmuta, ilmutaSchema } from "./schema";

// 교재 JSON은 이미지에 넣지 않고 실행할 때 CONTENT_DIR(기본 <cwd>/content)에서 읽는다.
// 파일이 바뀌면(mtime) 다시 읽고, 그대로면 검증한 결과를 그대로 쓴다.

export function contentDir(): string {
  return process.env.CONTENT_DIR ?? path.join(process.cwd(), "content");
}

const cache = new Map<string, { mtimeMs: number; data: unknown }>();

/** 없으면 null. 있는데 모양이 틀리면 던진다(데이터를 고쳐야 하므로). */
function readJson<T>(file: string, schema: z.ZodType<T>): T | null {
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

/** 강의 자막(`transcripts/ilmuta/L01.json`). 없거나 깨졌으면 조용히 null */
export function loadIlmutaTranscript(
  item: string,
  dir: string = contentDir(),
): Transcript | null {
  if (!/^L\d{2}$/.test(item)) return null;
  try {
    return readJson(
      path.join(dir, "transcripts", "ilmuta", `${item}.json`),
      transcriptSchema,
    );
  } catch {
    return null;
  }
}
