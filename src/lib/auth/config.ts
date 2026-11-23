// 로그인 설정값. 둘 중 하나라도 없으면 아무도 들어오지 못한다(열린 채로 뜨지 않게).
export interface AuthConfig {
  password: string;
  secret: string;
}

export function readAuthConfig(
  env: Record<string, string | undefined> = process.env,
): AuthConfig | null {
  const password = env.SITE_PASSWORD;
  const secret = env.SESSION_SECRET;
  if (!password || !secret || secret.length < 32) return null;
  return { password, secret };
}
