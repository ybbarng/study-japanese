"use client";

import { useEffect, useRef } from "react";
import { create } from "zustand";
import { LectureContext } from "@/components/context/lecture-context";
import type { LessonData } from "@/lib/ilmuta/server-data";
import { lectureItem } from "@/lib/ilmuta/tracks";
import { stageScrollBy } from "@/lib/player/follow";
import { useNowPlaying } from "./use-player-bridge";

/**
 * PC 가운데 칸의 강의 무대가 화면에 보이는지. 보이는 동안 오른쪽 칸은 같은 카드를 겹쳐 두지 않고
 * 자막 목록을 길게 보인다. 굴려서 무대가 화면 밖으로 나가면 오른쪽 칸이 다시 지금 하는 말을 맡는다.
 */
export const useLectureStage = create<{
  visible: boolean;
  setVisible: (v: boolean) => void;
}>((set) => ({
  visible: false,
  setVisible: (visible) => set({ visible }),
}));

/**
 * PC 강의 구역의 무대: 이 강 강의가 재생기에 올라 있는 동안 가운데 넓은 칸에 지금 하는 말을 크게
 * 둔다. 일본어가 나오면 읽는 법·뜻·낱말·그림을, 한국어 설명 중에는 방금 나온 일본어와 지금 설명,
 * 앞뒤 말을. 폰에서는 그리지 않는다(화면 위에 붙은 재생기가 지금 하는 말을 보인다).
 */
export function LectureStage({ data }: { data: LessonData }) {
  const now = useNowPlaying();
  const item = lectureItem(data.lesson.no);
  const staged = now.item === item && data.transcript !== null;
  const ref = useRef<HTMLDivElement>(null);
  const setVisible = useLectureStage((s) => s.setVisible);

  // 강의를 막 틀었을 때(무대가 새로 생길 때) PC에서 무대가 한 화면에 들어오게 굴린다.
  // 무대는 강 머리·받아 두기·재생 카드 아래(1440×900에서 약 430px)에서 시작해 아래가 화면 밖이었다.
  // 이미 재생 중인 강 화면을 열었을 때나 폰(무대 없음)에서는 굴리지 않는다
  const wasStaged = useRef(staged);
  useEffect(() => {
    const started = staged && !wasStaged.current;
    wasStaged.current = staged;
    if (!started) return;
    const frame = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el || el.offsetParent === null) return;
      const box = el.getBoundingClientRect();
      const anchor = el.previousElementSibling?.getBoundingClientRect() ?? box;
      const by = stageScrollBy(anchor.top, box.top, window.innerHeight);
      if (by > 0) window.scrollBy({ top: by, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [staged]);

  useEffect(() => {
    const el = ref.current;
    if (!staged || !el) return;
    // 폰에서는 display:none이라 교차하지 않는다(오른쪽 칸도 폰엔 없다)
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      setVisible(false);
    };
  }, [staged, setVisible]);

  if (!staged) return null;
  return (
    <div ref={ref} data-lecture-stage className="hidden lg:block">
      <LectureContext
        transcript={data.transcript}
        book="ilmuta"
        item={item}
        size="stage"
        heading={
          <p className="mb-3 text-sm text-ink-faint">
            지금 강의 · 일본어가 나오면 읽는 법·뜻·낱말이 여기에 크게 뜹니다
          </p>
        }
        className="min-h-[22rem]"
      />
    </div>
  );
}
