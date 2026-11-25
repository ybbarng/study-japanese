import type { AlternateCounts } from "./counts";
import type { StrokeFile } from "./types";

/**
 * 써 보기에서 고르는 "글자 묶음". 문자(가나·한자·키릴 문자 등)마다 묶음을 두고,
 * 묶음은 글자 목록과 획 데이터를 받는 법만 안다. 화면은 묶음의 정의만 보고 그린다.
 */

/** 연습할 글자 하나(요음 きゃ처럼 글자 둘일 수도 있다) */
export interface WritingItem {
  text: string;
  /** 소리·뜻 같은 짧은 풀이(한글로) */
  hint: string;
  /** 소리를 들려줄 수 있으면 그 소리 id(가나: /media/kana/<id>.mp3) */
  soundId?: string;
  /** 진도 기록에 쓸 id(가나 카드 id 등). 없으면 기록하지 않는다 */
  recordId?: string;
}

/** 이어서 연습하는 한 줄(가나는 あ행처럼 행) */
export interface WritingRow {
  id: string;
  label: string;
  items: WritingItem[];
}

export interface WritingSet {
  id: string;
  /** 화면에 보일 묶음 이름 */
  title: string;
  /** 문자 이름(히라가나·한자·키릴 문자 등) */
  script: string;
  /** 글줄 방향. 칸에 글자를 늘어놓을 때 쓴다(지금은 가로만 그린다) */
  direction: "ltr" | "rtl" | "ttb";
  /** 획 데이터의 출처 id(src/lib/sources/registry.ts) */
  sourceId: string;
  /** 이 묶음의 lang 속성 값 */
  lang: string;
  rows: WritingRow[];
  /** 손으로 쓸 때 데이터와 다른 획 수로도 쓰는 글자 */
  alternates: AlternateCounts;
  /** 이 묶음 데이터에 든 글자인지 */
  has: (ch: string) => boolean;
  /**
   * 획 데이터 받기. `chars`는 지금 필요한 글자들이다. 가나처럼 작은 묶음은 묶음 파일 하나를
   * 통째로 받고, 한자처럼 큰 묶음은 글자마다 나눈 파일에서 그 글자들만 받는다.
   */
  load: (chars: readonly string[]) => Promise<StrokeFile[]>;
}
