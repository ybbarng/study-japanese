import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaderRules } from "./headers";

describe("contentSecurityPolicy", () => {
  it("운영에서는 eval·웹소켓을 열지 않고, 다른 사이트가 틀로 넣지 못하게 한다", () => {
    const csp = contentSecurityPolicy(false);
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("connect-src 'self';");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it("dev에서는 빠른 새로고침이 쓰는 eval·웹소켓을 연다", () => {
    const csp = contentSecurityPolicy(true);
    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(csp).toContain("connect-src 'self' ws:");
  });
});

describe("securityHeaderRules", () => {
  const cspSource = (dev: boolean) =>
    securityHeaderRules(dev).find((r) =>
      r.headers.some((h) => h.key === "Content-Security-Policy"),
    )?.source;

  it("CSP는 교재 파일(/media/)을 빼고 붙인다(PDF 보기 창이 막히지 않게)", () => {
    const pattern = new RegExp(`^/${cspSource(false)?.slice(1)}$`);
    expect(pattern.test("/ilmuta/3")).toBe(true);
    expect(pattern.test("/media/ilmunta/book.pdf")).toBe(false);
  });

  it("HSTS는 운영에서만 붙인다", () => {
    const keys = (dev: boolean) =>
      securityHeaderRules(dev)[0].headers.map((h) => h.key);
    expect(keys(false)).toContain("Strict-Transport-Security");
    expect(keys(true)).not.toContain("Strict-Transport-Security");
  });
});
