import { describe, expect, it, vi } from "vitest";

// proxy(src/proxy.ts)를 비켜 간 요청이 와도 관리자 전용 라우트가 스스로 거절하는지 본다.
// 로그인 쿠키가 없는 방문자 요청이고, DB에 닿으면 안 되므로 getDb는 부르면 실패하게 둔다.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("@/lib/store/db", () => ({
  getDb: () => {
    throw new Error("관리자 확인 전에 DB를 열었다");
  },
}));

const json = (method: string, body: unknown) =>
  new Request("http://localhost/api/x", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("관리자 전용 라우트는 proxy 없이도 방문자를 401로 거절한다", () => {
  it("POST /api/listen", async () => {
    const { POST } = await import("./listen/route");
    const res = await POST(json("POST", { events: [] }));
    expect(res.status).toBe(401);
  });

  it("PUT /api/settings", async () => {
    const { PUT } = await import("./settings/route");
    const res = await PUT(json("PUT", { closedSources: [] }));
    expect(res.status).toBe(401);
  });

  it("PUT /api/state/[key]", async () => {
    const { PUT } = await import("./state/[key]/route");
    const res = await PUT(json("PUT", { value: 1, updatedAt: 1 }), {
      params: Promise.resolve({ key: "kana" }),
    });
    expect(res.status).toBe(401);
  });

  it("PUT /api/writings", async () => {
    const { PUT } = await import("./writings/route");
    const res = await PUT(json("PUT", {}));
    expect(res.status).toBe(401);
  });

  it("GET /api/export", async () => {
    const { GET } = await import("./export/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
