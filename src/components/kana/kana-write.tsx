"use client";

import { WritePractice } from "@/components/writing/write-practice";
import type { CardId } from "@/lib/kana/data";
import { useKanaStore } from "@/lib/kana/store";
import { WRITING_SETS } from "@/lib/writing/registry";
import { Screen, SoundButton } from "./ui";

/**
 * 가나 써 보기(/kana/write). 히라가나·가타카나 묶음에서 글자를 골라 획순대로 쓴다.
 * 다 쓴 기록은 가나 진도(writes)에 남고, 혼자 쓰기 단계는 복습 카드에도 맞음·틀림으로 적는다.
 * 진도는 다른 가나 화면처럼 이 브라우저에 남고, 로그인한 사람은 서버와 맞춘다.
 */
export function KanaWrite({ initialSetId }: { initialSetId?: string }) {
  const writes = useKanaStore((st) => st.writes);
  const recordWrite = useKanaStore((st) => st.recordWrite);
  const answer = useKanaStore((st) => st.answer);

  return (
    <WritePractice
      sets={WRITING_SETS}
      initialSetId={initialSetId}
      markOf={(item) => {
        const w = item.recordId ? writes[item.recordId as CardId] : undefined;
        return w ? (w.solo > 0 ? "solo" : "done") : null;
      }}
      onComplete={({ item, stage, mistakes }) => {
        if (!item.recordId) return;
        const id = item.recordId as CardId;
        const solo = stage === 3 && mistakes === 0;
        recordWrite(id, solo);
        if (stage === 3) answer(id, mistakes === 0);
      }}
      sound={(item) =>
        item.soundId ? <SoundButton soundId={item.soundId} /> : null
      }
      frame={({ main, aside }) => (
        <Screen title="써 보기" aside={aside} asideLabel="획순 그림과 키보드">
          {main}
        </Screen>
      )}
    />
  );
}
