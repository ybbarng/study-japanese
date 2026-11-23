"use client";

import { useCachedAudio } from "@/components/offline/use-cached-audio";
import { usePlayer } from "@/lib/player/store";
import { progressOf } from "@/lib/player/time";
import { DockBar } from "./dock-bar";
import { ExpandedPlayer } from "./expanded-player";
import { MiniBar } from "./mini-bar";
import type { PlayerViewProps } from "./player-view";

/** 재생 화면: 폰은 아래 작은 막대와 화면 전체 재생 화면, PC는 아래 도킹 막대와 오른쪽 패널 */
export function NowPlaying(p: PlayerViewProps) {
  const expanded = usePlayer((s) => s.expanded);
  const setExpanded = usePlayer((s) => s.setExpanded);
  const cached = useCachedAudio(p.track.src);
  const progress = progressOf(p.pos, p.duration, p.gap);

  return (
    <>
      {/* 아래 막대만큼 자리를 비워 화면 끝 내용이 가려지지 않게 */}
      <div aria-hidden className="h-24" />
      <MiniBar
        p={p}
        progress={progress}
        cached={cached}
        onExpand={() => setExpanded(true)}
      />
      <DockBar
        p={p}
        cached={cached}
        expanded={expanded}
        onExpand={setExpanded}
      />
      {expanded ? (
        <ExpandedPlayer p={p} onClose={() => setExpanded(false)} />
      ) : null}
    </>
  );
}
