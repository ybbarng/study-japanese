import { expect, test } from "@playwright/test";
import { login } from "./helpers/auth";

// 빌드한 앱에서 보안 머리·다른 사이트 쓰기 막기·미디어 경로를 본다(docs/security.md).

test.describe("보안 머리", () => {
  test("화면에 CSP·nosniff·틀 넣기 막기를 붙이고 서버 이름을 알리지 않는다", async ({
    request,
  }) => {
    const res = await request.get("/ilmuta");
    const headers = res.headers();
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-powered-by"]).toBeUndefined();
  });
});

test.describe("다른 사이트에서 보낸 쓰기 요청", () => {
  const event = {
    clientId: "e2e-security-0001",
    book: "ilmuta",
    item: "security-spec",
    kind: "lecture",
    startedAt: Date.UTC(2027, 0, 3),
    listenedSec: 1,
    completed: false,
  };

  test("로그인 쿠키가 실려 있어도 같은 출처가 아니면 403", async ({ page }) => {
    await login(page, "/ilmuta");
    const post = (headers: Record<string, string>) =>
      page.request.post("/api/listen", {
        data: { events: [event] },
        headers,
      });
    expect((await post({ "Sec-Fetch-Site": "same-site" })).status()).toBe(403);
    expect((await post({ Origin: "https://other.example" })).status()).toBe(
      403,
    );
    expect((await post({ "Sec-Fetch-Site": "same-origin" })).status()).toBe(
      200,
    );
  });
});

test.describe("미디어 경로", () => {
  test("노래 음원은 로그인하지 않은 사람에게 주지 않는다", async ({
    request,
  }) => {
    expect((await request.get("/media/songs/e2e-song.mp3")).status()).toBe(403);
  });

  test("폴더 밖으로 나가는 주소는 404", async ({ request }) => {
    expect(
      (await request.get("/media/kana/..%2Fsongs/e2e-song.mp3")).status(),
    ).toBe(404);
  });

  test("깨진 %인코딩 주소는 500이 아니라 400", async ({ request }) => {
    for (const url of ["/media/ilmuta/%E0%A4%A", "/api/state/%E0%A4%A"])
      expect((await request.get(url)).status(), url).toBe(400);
  });
});
