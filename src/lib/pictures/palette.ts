/**
 * 그림(SVG)에 쓰는 색. 그림은 `<img>`로 붙어 화면의 CSS 변수를 받지 못하므로 색을 파일에 그대로 적는다.
 * 배경은 투명이고, 어두운 화면(#0e1220)과 밝은 화면(#ffffff) 모두에서 보이도록 고른 색만 쓴다.
 *
 * - `line`: 윤곽·눈썹·입·글자 없는 표시선. 두 배경 모두와 3:1 넘게 대비된다(palette.test.ts).
 * - 아주 밝은 색(white·cream·skin)은 밝은 화면에서 배경에 묻히므로 반드시 `line` 윤곽을 두른다.
 * - 아주 어두운 색은 두지 않는다(어두운 화면에서 사라진다). `eye`는 피부 위 작은 점에만 쓴다.
 */
export const PALETTE = {
  line: "#7a6a62",
  eye: "#3a3040",
  white: "#f6f2ea",
  cream: "#fbe7b0",
  skin: "#f3c9a4",
  skinShade: "#e3a57f",
  hair: "#8a5a3c",
  hairDark: "#5e4a6e",
  red: "#e8553e",
  redDark: "#b8402f",
  pink: "#f4a0b8",
  orange: "#f0923a",
  yellow: "#f5c84c",
  green: "#5fb36f",
  greenDark: "#3d8a50",
  teal: "#3fb0a6",
  tealDark: "#2f8f86",
  sky: "#79bde8",
  blue: "#4a82d4",
  blueDark: "#3b62a8",
  purple: "#9b72c9",
  brown: "#a8714a",
  wood: "#d29a63",
  gray: "#a0a6b3",
  grayDark: "#6c7280",
} as const;

export type PaletteName = keyof typeof PALETTE;

/** 파일에 쓸 수 있는 색(소문자 #rrggbb) */
export const PALETTE_COLORS: ReadonlySet<string> = new Set(
  Object.values(PALETTE),
);

/** 상대 휘도(WCAG) */
export function luminance(hex: string): number {
  const v = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

/** 두 색의 대비(1~21) */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** 사이트의 어두운 바탕과, 앞으로 둘 수 있는 밝은 바탕 */
export const BACKGROUNDS = { dark: "#0e1220", light: "#ffffff" } as const;
