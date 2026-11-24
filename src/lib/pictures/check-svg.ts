import { PALETTE_COLORS } from "./palette";

// 그림 파일(SVG 글)이 docs/pictures.md 규칙을 지키는지 본다. 어긴 곳을 한국어로 돌려준다(없으면 빈 배열).

export type PictureKind = "words" | "scenes";

export const VIEW_BOX: Record<PictureKind, string> = {
  words: "0 0 64 64",
  scenes: "0 0 320 200",
};

/** 파일 크기 상한(바이트). 화면에 여러 장 뜨므로 작게 둔다 */
export const MAX_BYTES: Record<PictureKind, number> = {
  words: 6_000,
  scenes: 30_000,
};

/** 쓰지 않는 요소: 글자(교재 글 옮기기·글꼴 문제), 바깥 그림, 스크립트, 효과 */
const FORBIDDEN_TAGS = [
  "text",
  "tspan",
  "textPath",
  "image",
  "script",
  "foreignObject",
  "style",
  "filter",
  "linearGradient",
  "radialGradient",
  "pattern",
  "mask",
  "a",
];

/** fill을 직접 적어야 하는 도형(빠지면 검정으로 채워져 어두운 화면에서 사라진다) */
const SHAPES = ["path", "circle", "ellipse", "rect", "polygon", "polyline"];

const COLOR_ATTRS = ["fill", "stroke", "stop-color", "color"];

export function checkSvg(text: string, kind: PictureKind): string[] {
  const problems: string[] = [];
  const body = text.replace(/<!--[\s\S]*?-->/g, "");
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > MAX_BYTES[kind])
    problems.push(`크기 ${bytes}바이트가 상한 ${MAX_BYTES[kind]}를 넘는다`);

  const root = body.match(/<svg\b([^>]*)>/);
  if (!root || body.trimStart().indexOf("<svg") !== 0)
    problems.push("파일이 <svg로 시작하지 않는다");
  else {
    const attrs = root[1];
    if (!/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(attrs))
      problems.push("xmlns가 없다");
    if (!attrs.includes(`viewBox="${VIEW_BOX[kind]}"`))
      problems.push(`viewBox가 "${VIEW_BOX[kind]}"가 아니다`);
    if (/\s(width|height)=/.test(attrs))
      problems.push("svg에 width·height를 적지 않는다(화면이 크기를 정한다)");
  }

  for (const tag of FORBIDDEN_TAGS)
    if (new RegExp(`<${tag}[\\s>/]`).test(body))
      problems.push(`<${tag}>를 쓰지 않는다`);
  if (/\son[a-z]+=/i.test(body)) problems.push("on… 이벤트 속성을 쓰지 않는다");
  for (const m of body.matchAll(/(?:xlink:)?href="([^"]*)"/g))
    if (!m[1].startsWith("#"))
      problems.push(`바깥을 가리키는 href "${m[1]}"를 쓰지 않는다`);
  if (/url\(/.test(body)) problems.push("url()을 쓰지 않는다");
  if (/style="/.test(body))
    problems.push("style 속성 대신 fill·stroke 속성을 쓴다");

  for (const m of body.matchAll(/<(\w+)\b([^>]*)>/g)) {
    const [, tag, attrs] = m;
    if (SHAPES.includes(tag) && !/\sfill="/.test(attrs))
      problems.push(`<${tag}>에 fill이 없다(선만이면 fill="none")`);
    for (const a of COLOR_ATTRS)
      for (const c of attrs.matchAll(new RegExp(`\\s${a}="([^"]*)"`, "g"))) {
        const v = c[1].toLowerCase();
        if (v !== "none" && !PALETTE_COLORS.has(v))
          problems.push(`${a}="${c[1]}"는 팔레트에 없는 색이다`);
      }
  }
  return [...new Set(problems)];
}
