import type { PageRange } from "./schema";
import { pdfLines } from "./text-utils";

/**
 * 일문따 핵심정리 소책자(`pdftotext -layout`)의 과 머리:
 *   `    01    명사의 보통체형          본 책 023~029쪽`
 */
export function parseIlmuntaBookletHeaders(
  text: string,
): { no: number; title: string; pages: PageRange }[] {
  const out: { no: number; title: string; pages: PageRange }[] = [];
  for (const line of pdfLines(text)) {
    const m = line.match(
      /^\s*(\d{2})\s+(.+?)\s+본\s*책\s*(\d+)\s*~\s*(\d+)\s*쪽/,
    );
    if (!m) continue;
    out.push({
      no: Number(m[1]),
      title: m[2].replace(/\s+/g, " ").trim(),
      pages: { from: Number(m[3]), to: Number(m[4]) },
    });
  }
  return out;
}

/**
 * 일문따 60일 학습 스케줄(`pdftotext -raw`)에서 과마다 공부하는 날을 뽑는다.
 * raw 글은 칸 순서대로 나온다:
 *   학습일차 Day01 Day02 …   ← 이 줄 뒤로 날마다 `과정` 칸이 하나씩 온다
 *   01 / 명사의 / 보통체형    ← 과 번호 줄(`14,15`, `46①~⑧`, `1 1`처럼도 나온다)과 제목 줄
 *   페이지 023~ 029 …        ← 한 줄(다섯 날)이 끝남
 */
export function parseIlmuntaSchedule(rawText: string): Map<number, number[]> {
  const days = new Map<number, number[]>();
  let row: number[] = [];
  let next = 0;
  for (const line of pdfLines(rawText)) {
    if (line.includes("학습일차")) {
      row = [...line.matchAll(/Day\s*(\d+)/g)].map((m) => Number(m[1]));
      next = 0;
      continue;
    }
    if (line.trim().startsWith("페이지")) {
      row = [];
      continue;
    }
    if (next >= row.length) continue;
    const compact = line.replace(/\s+/g, "");
    const m = compact.match(/^(\d{1,2}(?:,\d{1,2})*)(?:[①-⑳]~(?:[①-⑳]|끝))?$/);
    if (!m) continue;
    const day = row[next++];
    for (const no of m[1].split(",").map(Number)) {
      const list = days.get(no) ?? [];
      if (!list.includes(day)) list.push(day);
      days.set(no, list);
    }
  }
  return days;
}

/**
 * 스케줄 표(`-layout`)의 준비마당 칸:
 *   `                  016-`
 *   `준비마당 일본어 글자들`
 *   `                  019`
 */
export function parseIlmuntaPreparation(
  layoutText: string,
): { title: string; pages?: PageRange } | undefined {
  const lines = pdfLines(layoutText);
  const at = lines.findIndex((l) => /^\s*준비마당\s+\S/.test(l));
  if (at < 0) return undefined;
  const title = (
    lines[at].match(/준비마당\s+(.+?)(?:\s{2,}|$)/)?.[1] ?? ""
  ).trim();
  const from = lines
    .slice(Math.max(0, at - 3), at)
    .reverse()
    .map((l) => l.match(/(\d{3})-/)?.[1])
    .find(Boolean);
  const to = lines
    .slice(at + 1, at + 4)
    .map((l) => l.match(/^\s*(\d{3})(?:\s|$)/)?.[1])
    .find(Boolean);
  return {
    title,
    ...(from && to ? { pages: { from: Number(from), to: Number(to) } } : {}),
  };
}
