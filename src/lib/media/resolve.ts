import path from "node:path";

const ALLOWED_EXT = new Map([
  [".mp3", "audio/mpeg"],
  [".m4a", "audio/mp4"],
  [".pdf", "application/pdf"],
]);

export interface ResolvedMedia {
  absolutePath: string;
  contentType: string;
}

/** URL 조각들을 MEDIA_DIR 안의 파일로 바꾼다. 폴더 밖으로 나가거나 허용하지 않은 형식이면 null. */
export function resolveMediaPath(
  mediaDir: string,
  segments: string[],
): ResolvedMedia | null {
  if (segments.length === 0) return null;
  if (
    segments.some(
      (s) =>
        s === "" ||
        s === "." ||
        s === ".." ||
        s.includes("/") ||
        s.includes("\\") ||
        s.includes("\0"),
    )
  ) {
    return null;
  }
  const root = path.resolve(mediaDir);
  const absolutePath = path.resolve(root, ...segments);
  if (!absolutePath.startsWith(root + path.sep)) return null;
  const contentType = ALLOWED_EXT.get(path.extname(absolutePath).toLowerCase());
  if (!contentType) return null;
  return { absolutePath, contentType };
}

export interface ByteRange {
  start: number;
  end: number;
}

/** "bytes=a-b" 하나만 받는다. 맞지 않으면 null(전체를 보낸다), 범위 밖이면 "invalid". */
export function parseRange(
  header: string | null,
  size: number,
): ByteRange | null | "invalid" {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === "" && match[2] === "")) return null;
  let start: number;
  let end: number;
  if (match[1] === "") {
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  if (start >= size || start > end) return "invalid";
  return { start, end };
}
