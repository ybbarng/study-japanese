import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { contentDir } from "@/lib/textbook/load";
import { type Ilmunta, ilmuntaSchema } from "@/lib/textbook/schema";

// 일문따 교재 JSON(CONTENT_DIR/textbook/ilmunta.json)을 서버에서 읽는다. git 밖 파일이다.
// 파일이 바뀌면(mtime) 다시 읽고, 그대로면 검증한 결과를 그대로 쓴다.

let cache: { file: string; mtimeMs: number; data: Ilmunta } | null = null;

/** 없으면 null. 있는데 모양이 틀리면 던진다(데이터를 고쳐야 하므로) */
export function loadIlmunta(dir: string = contentDir()): Ilmunta | null {
  const file = path.join(dir, "textbook", "ilmunta.json");
  let mtimeMs: number;
  try {
    mtimeMs = statSync(file).mtimeMs;
  } catch {
    return null;
  }
  if (cache && cache.file === file && cache.mtimeMs === mtimeMs)
    return cache.data;
  const data = ilmuntaSchema.parse(JSON.parse(readFileSync(file, "utf8")));
  cache = { file, mtimeMs, data };
  return data;
}
