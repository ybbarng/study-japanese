import { describe, expect, it } from "vitest";
import { checkSvg } from "./check-svg";
import { PALETTE } from "./palette";

const word = (inner: string, root = 'viewBox="0 0 64 64"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${root}>\n${inner}\n</svg>\n`;

describe("checkSvg", () => {
  it("규칙을 지킨 낱말 그림은 문제가 없다", () => {
    const svg = word(
      `<!-- 공 -->\n<circle cx="32" cy="32" r="20" fill="${PALETTE.red}" stroke="${PALETTE.line}" stroke-width="2"/>\n<path d="M10 10h4" fill="none" stroke="${PALETTE.line}"/>`,
    );
    expect(checkSvg(svg, "words")).toEqual([]);
  });

  it("viewBox가 종류와 다르면 알린다", () => {
    const svg = word(
      `<circle cx="1" cy="1" r="1" fill="${PALETTE.red}"/>`,
      'viewBox="0 0 320 200"',
    );
    expect(checkSvg(svg, "words")).toEqual(['viewBox가 "0 0 64 64"가 아니다']);
  });

  it("fill이 빠진 도형을 알린다(검정으로 채워진다)", () => {
    const svg = word(`<path d="M1 1L5 5L1 5" stroke="${PALETTE.line}"/>`);
    expect(checkSvg(svg, "words")).toEqual([
      '<path>에 fill이 없다(선만이면 fill="none")',
    ]);
  });

  it("팔레트 밖 색과 이름 색을 알린다", () => {
    const svg = word(
      `<rect x="0" y="0" width="4" height="4" fill="#000000" stroke="black"/>`,
    );
    expect(checkSvg(svg, "words")).toEqual([
      'fill="#000000"는 팔레트에 없는 색이다',
      'stroke="black"는 팔레트에 없는 색이다',
    ]);
  });

  it("글자·바깥 그림·스크립트를 막는다", () => {
    const svg = word(
      `<text x="1" y="1" fill="${PALETTE.red}">あ</text><image href="https://example.com/a.png"/><script>1</script>`,
    );
    expect(checkSvg(svg, "words")).toEqual([
      "<text>를 쓰지 않는다",
      "<image>를 쓰지 않는다",
      "<script>를 쓰지 않는다",
      '바깥을 가리키는 href "https://example.com/a.png"를 쓰지 않는다',
    ]);
  });

  it("크기 상한을 넘으면 알린다", () => {
    const big = `<path d="M0 0${"h1".repeat(3000)}" fill="none" stroke="${PALETTE.line}"/>`;
    expect(checkSvg(word(big), "words")[0]).toMatch(
      /^크기 \d+바이트가 상한 6000를 넘는다$/,
    );
  });
});
