// 따라 말하기 녹음의 순수 로직. 녹음은 폰 안(IndexedDB)에만 두고 서버에 올리지 않는다.

/** 안드로이드 크롬은 webm/opus, 사파리는 mp4를 받는다. 앞에서부터 되는 것을 고른다 */
const CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

export function pickMimeType(
  isSupported: (type: string) => boolean,
): string | undefined {
  return CANDIDATES.find((t) => isSupported(t));
}

export interface TakeMeta {
  id: string;
  /** 강 번호와 예문(`01-4-2`) */
  lesson: number;
  exampleId: string;
  createdAt: number;
  durationSec: number;
}

/** 예문마다 최근 max개만 남긴다. 지울 것의 id를 돌려준다 */
export function takesToPrune(takes: TakeMeta[], max: number): string[] {
  const byExample = new Map<string, TakeMeta[]>();
  for (const t of takes) {
    const key = `${t.lesson}/${t.exampleId}`;
    byExample.set(key, [...(byExample.get(key) ?? []), t]);
  }
  const out: string[] = [];
  for (const list of byExample.values()) {
    list.sort((a, b) => b.createdAt - a.createdAt);
    out.push(...list.slice(max).map((t) => t.id));
  }
  return out;
}

export type MicError = "denied" | "unsupported" | "no-device" | "other";

/** getUserMedia·MediaRecorder 실패를 화면 안내 종류로 */
export function classifyMicError(err: unknown): MicError {
  const name =
    typeof err === "object" && err !== null && "name" in err
      ? String((err as { name: unknown }).name)
      : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "no-device";
  if (name === "NotSupportedError" || name === "TypeError")
    return "unsupported";
  return "other";
}
