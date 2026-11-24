// 교재 영역 구역 끝의 확인 문제. 화면(DOM)을 모르는 데이터 모양만 둔다.

/** 문제를 내는 자리: 일무따 강 화면의 구역, 일문따 과 화면의 활용 */
export type QuizSection = "words" | "patterns" | "conversation" | "drill";

/** 예문 mp3 안 문장 하나(예문 id와 그 안 문장 차례). 소리 문제·다시 듣기가 이 구간을 튼다 */
export interface ClipRef {
  item: string;
  index: number;
}

/** 일본어 글과 읽는 법(한자 위에 후리가나를 달 때) */
export interface JaText {
  ja: string;
  reading?: string;
}

export type Prompt =
  /** 낱말을 보이고 묻는다(뜻은? 읽는 법은?) */
  | { kind: "word"; word: JaText; ask: string }
  /** 소리만 들려주고 묻는다. 소리를 못 틀면 fallback 글을 보인다 */
  | { kind: "listen"; clip: ClipRef; ask: string; fallback: JaText }
  /** 일본어 문장의 빈칸. 한국어 뜻이 단서다 */
  | { kind: "blank"; before: string; after: string; ko: string; ask: string }
  /** 이 상황에서 할 말 고르기. 앞 사람의 말이 있으면 함께 보인다 */
  | {
      kind: "say";
      ko: string;
      ask: string;
      before?: { speaker?: string; ja: string; ko: string };
    };

export interface ChoiceOption {
  label: string;
  /** 일본어 보기면 읽는 법(후리가나)과 lang을 단다 */
  ja?: boolean;
  reading?: string;
  /** 틀린 보기를 골랐을 때 "그건 무엇인지" 한 줄 */
  note?: string;
}

interface QuestionBase {
  /** 같은 문제를 알아보는 열쇠(간격 반복 기록). 교재 글이 아니라 자리로 만든다 */
  key: string;
  lesson: number;
  section: QuizSection;
  /** 틀렸을 때 보일 까닭(규칙·뜻) */
  explain: string;
  /** 정답 문장(틀렸을 때 다시 보이고, 다시 들을 수 있다) */
  reveal?: { ja: string; ko: string; reading?: string };
  /** 다시 듣기로 틀 구간 */
  clip?: ClipRef;
}

export interface ChoiceQuestion extends QuestionBase {
  type: "choice";
  prompt: Prompt;
  options: ChoiceOption[];
  answer: number;
}

/** 어순 맞추기: 조각을 눌러 차례대로 놓는다 */
export interface OrderQuestion extends QuestionBase {
  type: "order";
  ko: string;
  /** 섞어 놓은 조각 */
  tiles: string[];
  /** 맞는 차례의 조각 */
  answer: string[];
  /** 문장 끝 문장부호(조각으로 내지 않고 끝에 붙여 보인다) */
  tail: string;
  /** 정답으로 받아 줄 꼴: 술어 앞 마디는 차례를 바꿔도 맞다(order.ts orderShape) */
  shape: { phrases: string[][]; fixed: string[] };
  /** 조각 글 → 후리가나를 달 낱말 조각(낱말 분석의 읽는 법) */
  tileTokens: Record<string, { surface: string; reading?: string }[]>;
}

export type Question = ChoiceQuestion | OrderQuestion;

/** 소리 구간을 찾을 수 있는지(자막에서 그 문장의 시각을 얻었는지) */
export type HasClip = (clip: ClipRef) => boolean;
