"use client";

import { useTranscript } from "@/components/context/use-transcript";
import type { Transcript } from "@/lib/context/cues";
import { KIND_LABEL } from "@/lib/ilmuta/labels";
import type { LessonData } from "@/lib/ilmuta/server-data";
import { lectureItem } from "@/lib/ilmuta/tracks";
import { useNowPlaying } from "./use-player-bridge";

export interface LessonNow {
  /** 자막을 따라갈 재생기 항목(강의 L01 또는 예문 01-2) */
  item: string;
  /** 이 강 예문이 재생 중이면 "기본 단어 익히기"처럼, 아니면 null */
  exampleLabel: string | null;
  transcript: Transcript | null;
}

/**
 * 강 화면의 자막이 따라갈 항목. 강의가 끝나 그 강 예문이 이어지면 그 예문(자막이 있을 때),
 * 아니면 강의. 강의를 틀기 전이나 다른 강을 듣는 중이면 강의.
 */
export function useLessonNow(data: LessonData): LessonNow {
  const { lesson } = data;
  const now = useNowPlaying();
  const example = lesson.examples.find((e) => e.id === now.item) ?? null;
  const fetched = useTranscript(
    example ? "ilmuta" : undefined,
    example?.id ?? undefined,
  );
  const exampleLabel = example ? KIND_LABEL[example.kind] : null;
  if (example && fetched && fetched.item === example.id)
    return { item: example.id, exampleLabel, transcript: fetched };
  // 자막이 없는 예문이면 자막은 강의 것을 두되, 지금 무엇이 나오는지는 알린다
  return {
    item: lectureItem(lesson.no),
    exampleLabel,
    transcript: data.transcript,
  };
}
