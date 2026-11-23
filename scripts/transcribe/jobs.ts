/** 전사할 오디오 파일 목록. 차례: 일무따 강의 → 일무따 예문 → 일문따 강의 → 일문따 예문 */
import { readdirSync } from "node:fs";
import path from "node:path";
import type { TranscriptBook, TranscriptKind } from "@/lib/transcript/schema";
import type { FileJob } from "./transcribe-file";

export type SourceDirs = { ilmuta: string; ilmunta: string };

const GROUPS: { book: TranscriptBook; kind: TranscriptKind; sub: string }[] = [
  { book: "ilmuta", kind: "lecture", sub: "1. 음성 강의" },
  { book: "ilmuta", kind: "example", sub: "2. 예문 mp3" },
  { book: "ilmunta", kind: "lecture", sub: "강의 mp3" },
  { book: "ilmunta", kind: "example", sub: "예문 mp3" },
];

export function listJobs(dirs: SourceDirs): FileJob[] {
  return GROUPS.flatMap(({ book, kind, sub }) => {
    const dir = path.join(dirs[book], sub);
    return readdirSync(dir)
      .filter((n) => /\.mp3$/i.test(n))
      .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
      .map((name) => ({
        book,
        kind,
        item: name.replace(/\.mp3$/i, ""),
        src: path.join(dir, name),
      }));
  });
}
