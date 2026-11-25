"use client";

import { useEffect, useState } from "react";
import { acceptedStrokeCounts } from "@/lib/writing/counts";
import { layoutText, type StrokeLayout } from "@/lib/writing/layout";
import { loadStrokes, writingSetOf } from "@/lib/writing/registry";
import type { Pt } from "@/lib/writing/types";
import { strokePoints } from "./path-points";

export interface StrokeGuideData {
  /** 아직 받는 중이면 false */
  ready: boolean;
  /** 획 데이터가 없는 글이면 null(그때는 글꼴 본보기로 돌아간다) */
  layout: StrokeLayout | null;
  /** 받을 획 수 후보(첫 값이 데이터 획 수) */
  counts: number[];
  /** 본보기 획을 칸 좌표 점으로(채점용) */
  points: Pt[][];
}

const EMPTY: StrokeGuideData = {
  ready: false,
  layout: null,
  counts: [],
  points: [],
};

/** 글의 획 데이터를 그 글자가 든 묶음에서만 받아 칸에 늘어놓는다 */
export function useStrokeLayout(text: string): StrokeGuideData {
  const [data, setData] = useState<StrokeGuideData>(EMPTY);
  useEffect(() => {
    let live = true;
    setData(EMPTY);
    loadStrokes(text)
      .then((table) => {
        if (!live) return;
        const layout = layoutText(text, table);
        const alternates = writingSetOf([...text][0] ?? "")?.alternates ?? {};
        setData({
          ready: true,
          layout,
          counts: acceptedStrokeCounts(text, table, alternates),
          points: layout ? strokePoints(layout) : [],
        });
      })
      .catch(() => {
        // 받지 못하면(끊긴 채 처음 여는 묶음) 글꼴 본보기로 쓴다
        if (live) setData({ ...EMPTY, ready: true });
      });
    return () => {
      live = false;
    };
  }, [text]);
  return data;
}
