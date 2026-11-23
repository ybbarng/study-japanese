"use client";

import { KIND_LABEL } from "@/lib/ilmuta/labels";
import { listenOnlyExamples } from "@/lib/ilmuta/steps";
import { exampleTrack } from "@/lib/ilmuta/tracks";
import type { StepProps } from "./lesson-types";
import { PlayCard } from "./play-card";
import { useNowPlaying, usePlay } from "./use-player-bridge";

const NOTE: Record<string, string> = {
  dialogue: "이 강의 회화를 글 없이 먼저 들어 보기",
  exercise: "책의 연습 문제를 귀로 풀기",
  longReading: "긴 글에 도전하기",
};

/** 글이 없는 코너(-1·-5·-6)는 듣기만. 한 번에 이어 듣기도 */
export function StepListen({ data, listens }: StepProps) {
  const { lesson } = data;
  const play = usePlay();
  const now = useNowPlaying();
  const examples = listenOnlyExamples(lesson);
  const tracks = examples.map((e) => exampleTrack(lesson, e));

  return (
    <div className="space-y-3">
      {examples.map((e, i) => (
        <PlayCard
          key={e.id}
          title={KIND_LABEL[e.kind]}
          note={NOTE[e.kind]}
          durationSec={e.durationSec}
          count={listens[e.id]}
          playing={now.item === e.id && now.playing}
          onPress={() => play(tracks, i)}
        />
      ))}
      <p className="px-1 pt-2 text-sm text-ink-faint">
        하나를 틀면 아래 것까지 이어서 나옵니다.
      </p>
    </div>
  );
}
