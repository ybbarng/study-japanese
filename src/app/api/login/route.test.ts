import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_POLICY, loginLockout } from "@/lib/auth/lockout";
import { POST } from "./route";

// 시험용 값(운영 값 아님). 이 파일의 워커 안에서만 바뀐다
const PASSWORD = "route-test-password-0001";

function attempt(password: string): Promise<Response> {
  const form = new FormData();
  form.set("password", password);
  form.set("next", "/ilmuta");
  return POST(
    new Request("http://localhost/api/login", { method: "POST", body: form }),
  );
}

/**
 * 실패 뒤 늦추기(setTimeout)를 가짜 시계로 넘기며 끝날 때까지 기다린다.
 * 암호 해시(Web Crypto)는 진짜 비동기라 한 번 넘겨서는 그 뒤에 걸린 늦추기를 놓친다.
 */
async function settleWithFakeTimers<T>(promise: Promise<T>): Promise<T> {
  let done = false;
  const tracked = promise.finally(() => {
    done = true;
  });
  for (let i = 0; i < 200 && !done; i++) {
    await vi.advanceTimersByTimeAsync(1_000);
    await new Promise((r) => setImmediate(r));
  }
  return tracked;
}

beforeEach(() => {
  vi.stubEnv("SITE_PASSWORD", PASSWORD);
  vi.stubEnv("SESSION_SECRET", "route-test-secret-0123456789abcdef0123");
  // setImmediate는 진짜로 둔다(settleWithFakeTimers가 진짜 비동기 일을 기다리는 데 쓴다)
  vi.useFakeTimers({ toFake: ["setTimeout", "Date"] });
  loginLockout.reset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  loginLockout.reset();
});

describe("POST /api/login 대입 막기", () => {
  it("한꺼번에 보낸 틀린 시도도 상한만큼만 암호를 확인하고 나머지는 잠김으로 돌려보낸다", async () => {
    const burst = Promise.all(
      Array.from({ length: 30 }, (_, i) => attempt(`wrong-${i}`)),
    );
    const responses = await settleWithFakeTimers(burst);
    const locations = responses.map((r) => r.headers.get("location") ?? "");
    const checked = locations.filter((l) => l.includes("error=1")).length;
    expect(checked).toBe(DEFAULT_POLICY.maxFailures + 1);
    expect(locations.filter((l) => l.includes("locked=")).length).toBe(
      30 - checked,
    );
  });

  it("잠겨 있지 않으면 맞는 암호로 로그인 쿠키를 받는다", async () => {
    const res = await attempt(PASSWORD);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/ilmuta");
    expect(res.headers.get("set-cookie")).toContain("HttpOnly");
  });
});
