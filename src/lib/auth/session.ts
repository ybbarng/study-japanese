// 로그인 쿠키 토큰: "<만료 시각 ms>.<HMAC-SHA256 base64url>"
// proxy(Node·Edge 어느 쪽이든)에서 쓰도록 Web Crypto만 쓴다.

export const SESSION_COOKIE = "sj_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 180; // 180일: 폰에서 자주 다시 로그인하지 않게

const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(
    await crypto.subtle.sign("HMAC", key, encoder.encode(payload)),
  );
}

/** 길이가 같을 때 글자를 모두 비교해 걸린 시간으로 값을 짐작하지 못하게 한다. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * 입력한 암호가 맞는지. 둘 다 SHA-256으로 같은 길이로 만든 뒤 견줘서, 걸린 시간으로
 * 암호 길이도 짐작하지 못하게 한다(timingSafeEqual은 길이가 다르면 바로 돌아온다).
 */
export async function passwordMatches(
  input: string,
  expected: string,
): Promise<boolean> {
  const digest = async (s: string) =>
    toBase64Url(await crypto.subtle.digest("SHA-256", encoder.encode(s)));
  const [a, b] = await Promise.all([digest(input), digest(expected)]);
  return timingSafeEqual(a, b);
}

export async function createSessionToken(
  secret: string,
  now: number,
  ttlMs: number = SESSION_TTL_MS,
): Promise<string> {
  const expires = String(now + ttlMs);
  return `${expires}.${await sign(expires, secret)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
  now: number,
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const expires = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  if (!/^\d+$/.test(expires) || Number(expires) <= now) return false;
  return timingSafeEqual(mac, await sign(expires, secret));
}
