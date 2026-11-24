// 운영 점검의 응답 판정. 네트워크 없이 상태 코드·헤더·본문 모양만 보고 정한다.

export type Verdict =
  | { ok: true }
  /** 출처가 닫혀 있어 방문자에게 403인 것. 실패로 세지 않고 따로 센다 */
  | { ok: true; closed: true }
  | { ok: false; reason: string };

export interface Reply {
  status: number;
  contentType: string | null;
}

function typeOf(contentType: string | null): string {
  return (contentType ?? "").split(";")[0].trim().toLowerCase();
}

/**
 * 교재 미디어(Range: bytes=0-0으로 받은 것). 열린 출처면 206(또는 200)과 오디오·PDF 형식,
 * 닫힌 출처면 방문자에게 403이 맞다.
 */
export function judgeMedia(
  reply: Reply,
  opts: { open: boolean; pdf?: boolean },
): Verdict {
  if (!opts.open) {
    return reply.status === 403
      ? { ok: true, closed: true }
      : { ok: false, reason: `닫힌 출처인데 ${reply.status}` };
  }
  if (reply.status !== 206 && reply.status !== 200)
    return { ok: false, reason: String(reply.status) };
  const type = typeOf(reply.contentType);
  const typeOk = opts.pdf
    ? type === "application/pdf"
    : type.startsWith("audio/");
  if (!typeOk)
    return {
      ok: false,
      reason: `${reply.status}이지만 형식이 ${type || "(없음)"}`,
    };
  return { ok: true };
}

/** 로그인 전용 자료(노래 오디오): 방문자는 403이어야 한다 */
export function judgeAdminOnly(reply: Reply): Verdict {
  return reply.status === 403
    ? { ok: true }
    : { ok: false, reason: `방문자에게 ${reply.status}(403이어야 함)` };
}

/** 화면: 200이고 HTML */
export function judgePage(reply: Reply): Verdict {
  if (reply.status !== 200) return { ok: false, reason: String(reply.status) };
  if (typeOf(reply.contentType) !== "text/html")
    return {
      ok: false,
      reason: `200이지만 형식이 ${typeOf(reply.contentType)}`,
    };
  return { ok: true };
}

/** 자막 API: 200이고 segments가 비어 있지 않다. 닫힌 출처면 403이 맞다 */
export function judgeTranscript(
  status: number,
  body: unknown,
  opts: { open: boolean },
): Verdict {
  if (!opts.open) {
    return status === 403
      ? { ok: true, closed: true }
      : { ok: false, reason: `닫힌 출처인데 ${status}` };
  }
  if (status !== 200) return { ok: false, reason: String(status) };
  const segments =
    body && typeof body === "object" && "segments" in body
      ? (body as { segments: unknown }).segments
      : undefined;
  if (!Array.isArray(segments)) return { ok: false, reason: "segments 없음" };
  if (segments.length === 0)
    return { ok: false, reason: "segments가 비어 있음" };
  return { ok: true };
}

/** 동시에 limit개까지만 돌린다. 결과는 입력 차례대로 */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker),
  );
  return results;
}
