"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { LESSONS } from "@/lib/kana/lessons";
import { useKanaHydrated, useKanaStore } from "@/lib/kana/store";
import { charHelpMode, type HelpMode } from "@/lib/word-tap/help-mode";
import { type TapToken, tapTokens } from "@/lib/word-tap/tokens";
import type { WordTapData } from "@/lib/word-tap/types";
import { WordPanel } from "./word-panel";

// 강 화면 한 장의 낱말 누르기 상태: 어느 문장의 몇째 조각을 골랐나, 글자 도움을 펼칠 강인가.
// 정보 창(폰은 아래에서 올라오는 시트, PC는 옆에 뜨는 창)은 이 공급자가 하나만 그린다.
// 공급자 밖(전역 재생 화면 등)에서는 누를 조각을 내주지 않아 원래 글이 그대로 보인다.

export interface Selected {
  ja: string;
  index: number;
}

interface WordTapValue {
  data: WordTapData;
  mode: HelpMode;
  selected: Selected | null;
  /** 이 문장의 누를 조각(없으면 null) */
  tokensOf: (ja: string) => TapToken[] | null;
  select: (sel: Selected, trigger?: HTMLElement | null) => void;
  close: () => void;
}

const WordTapContext = createContext<WordTapValue | null>(null);

/** 공급자 밖이면 null */
export function useWordTap(): WordTapValue | null {
  return useContext(WordTapContext);
}

/** 가나 레슨을 모두 끝냈는지(기기 기록을 아직 못 읽었으면 false) */
function useKanaDone(): boolean {
  const hydrated = useKanaHydrated();
  const lessons = useKanaStore((s) => s.lessons);
  return hydrated && LESSONS.every((l) => lessons[l.id] !== undefined);
}

export function WordTapProvider({
  data,
  children,
}: {
  data: WordTapData;
  children: ReactNode;
}) {
  const kanaDone = useKanaDone();
  const mode = charHelpMode(data.lessonNo, kanaDone);
  const [selected, setSelected] = useState<Selected | null>(null);
  // 창을 닫으면 누른 조각으로 초점을 돌려준다(키보드로 이어 읽게)
  const trigger = useRef<HTMLElement | null>(null);

  const tokensOf = useCallback(
    (ja: string) => tapTokens(ja, data.analyses[ja], mode === "open"),
    [data.analyses, mode],
  );
  const select = useCallback((sel: Selected, el?: HTMLElement | null) => {
    if (el) trigger.current = el;
    setSelected(sel);
  }, []);
  const close = useCallback(() => {
    setSelected(null);
    const el = trigger.current;
    trigger.current = null;
    if (el?.isConnected) el.focus();
  }, []);

  const value = useMemo(
    () => ({ data, mode, selected, tokensOf, select, close }),
    [data, mode, selected, tokensOf, select, close],
  );
  const tokens = selected ? tokensOf(selected.ja) : null;
  return (
    <WordTapContext.Provider value={value}>
      {children}
      {selected && tokens ? (
        <WordPanel
          key={`${selected.ja}#${selected.index}`}
          tokens={tokens}
          index={selected.index}
          grammar={data.analyses[selected.ja]?.grammar ?? []}
          learned={data.learned}
          lessonNo={data.lessonNo}
          mode={mode}
          onMove={(index) => setSelected({ ja: selected.ja, index })}
          onClose={close}
        />
      ) : null}
    </WordTapContext.Provider>
  );
}
