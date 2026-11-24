/**
 * 문장 빈칸 문제의 한국어 뜻을 만드는 작은 활용 도우미(순수 함수).
 * 낱말마다 줄기("먹")와 아/어 꼴("먹어")을 적어 두면, 받침을 보고 끝을 붙인다.
 * 듣다·걷다처럼 으가 붙을 때 줄기가 바뀌는 말은 세 번째 값("들으")을 준다.
 */

/** [줄기, 아/어 꼴, 으 앞 줄기(바뀔 때만)] */
export type KoStem = readonly [stem: string, aeo: string, eu?: string];

/** 한국어 서술어의 꼴 */
export type KoForm =
  | "plain" // 먹는다 · 춥다 · 학생이다
  | "polite" // 먹습니다 · 학생입니다
  | "past" // 먹었다 · 학생이었다
  | "pastPolite" // 먹었습니다
  | "neg" // 먹지 않는다 · 춥지 않다 · 학생이 아니다
  | "negPolite" // 먹지 않습니다 · 학생이 아닙니다
  | "pastNeg" // 먹지 않았다 · 학생이 아니었다
  | "pastNegPolite" // 먹지 않았습니다
  | "go" // 먹고 · 학생이고
  | "eoseo" // 먹어서
  | "aeo" // 먹어(주세요 앞)
  | "myeon" // 먹으면
  | "lsu" // 먹을 수
  | "neun" // 먹는(것 앞)
  | "ge" // 먹게
  | "ja" // 먹자
  | "imp" // 먹어라
  | "jima" // 먹지 마
  | "jil" // 추워질(거예요 앞) · 좋아하게 될
  | "naru" // 학생이 된다
  // 반말(해체): 일본어 보통체 회화(ねえ、～よ / ～から / ～けど)는 한국어 반말로 옮긴다.
  // 위 plain·neg·past·pastNeg(~다)는 글말이라 회화 보통체 뜻으로 쓰지 않는다
  | "casual" // 먹어 · 추워 · 학생이야
  | "casualNeg" // 먹지 않아 · 학생이 아니야
  | "casualPast" // 먹었어 · 학생이었어
  | "casualPastNeg"; // 먹지 않았어 · 학생이 아니었어

/** 서술어의 갈래: 동사(먹다), 형용사(춥다), 명사(학생 + 이다) */
export type KoKind = "verb" | "adj" | "noun";

const BASE = 0xac00;
const LAST = 0xd7a3;
/** 받침 번호 */
const J = { none: 0, n: 4, l: 8, b: 17, ss: 20 } as const;

function jongOf(ch: string): number {
  const c = ch.charCodeAt(0);
  if (c < BASE || c > LAST) return J.none;
  return (c - BASE) % 28;
}

function withJong(ch: string, jong: number): string {
  const c = ch.charCodeAt(0);
  if (c < BASE || c > LAST) return ch;
  return String.fromCharCode(c - ((c - BASE) % 28) + jong);
}

const lastOf = (s: string) => s.slice(-1);
const initOf = (s: string) => s.slice(0, -1);

/** 끝 글자에 받침을 바꿔 단다(없던 받침을 붙이거나 ㄹ을 갈아 끼운다) */
function setJong(s: string, jong: number): string {
  return initOf(s) + withJong(lastOf(s), jong);
}

/** 받침이 있는지(ㄹ 포함) */
export function hasBatchim(s: string): boolean {
  return jongOf(lastOf(s)) !== J.none;
}

const endsInL = (s: string) => jongOf(lastOf(s)) === J.l;

/** 으가 붙을 자리의 줄기: 받침이 있으면(ㄹ 빼고) 으를 붙인다 */
function euStem([stem, , eu]: KoStem): string {
  if (eu) return eu;
  return hasBatchim(stem) && !endsInL(stem) ? `${stem}으` : stem;
}

/** 아/어 꼴에 ㅆ을 달아 과거 줄기로(먹어 → 먹었, 봐 → 봤) */
const pastStem = ([, aeo]: KoStem) => setJong(aeo, J.ss);

function presentPlain(stem: string, kind: KoKind): string {
  if (kind === "adj") return `${stem}다`;
  if (!hasBatchim(stem)) return `${setJong(stem, J.n)}다`;
  if (endsInL(stem)) return `${setJong(stem, J.n)}다`;
  return `${stem}는다`;
}

function presentPolite(stem: string): string {
  if (!hasBatchim(stem) || endsInL(stem)) return `${setJong(stem, J.b)}니다`;
  return `${stem}습니다`;
}

/** 동사·형용사 서술어 */
export function koPredicate(
  ko: KoStem,
  form: KoForm,
  kind: "verb" | "adj",
): string {
  const [stem, aeo] = ko;
  const neg = kind === "verb" ? "않는다" : "않다";
  switch (form) {
    case "plain":
      return presentPlain(stem, kind);
    case "polite":
      return presentPolite(stem);
    case "past":
      return `${pastStem(ko)}다`;
    case "pastPolite":
      return `${pastStem(ko)}습니다`;
    case "neg":
      return `${stem}지 ${neg}`;
    case "negPolite":
      return `${stem}지 않습니다`;
    case "pastNeg":
      return `${stem}지 않았다`;
    case "pastNegPolite":
      return `${stem}지 않았습니다`;
    case "go":
      return `${stem}고`;
    case "eoseo":
      return `${aeo}서`;
    case "aeo":
      return aeo;
    case "myeon":
      return `${euStem(ko)}면`;
    case "lsu": {
      const base = euStem(ko);
      return `${endsInL(base) ? base : setJong(base, J.l)} 수`;
    }
    case "neun":
      return `${endsInL(stem) ? setJong(stem, J.none) : stem}는`;
    case "ge":
      return `${stem}게`;
    case "ja":
      return `${stem}자`;
    case "imp":
      return `${aeo}라`;
    case "jima":
      return `${stem}지 마`;
    case "jil":
      return kind === "verb" ? `${stem}게 될` : `${aeo}질`;
    case "naru":
      return `${stem}게 된다`;
    case "casual":
      return aeo;
    case "casualNeg":
      return `${stem}지 않아`;
    case "casualPast":
      return `${pastStem(ko)}어`;
    case "casualPastNeg":
      return `${stem}지 않았어`;
  }
}

/** 명사 + 이다(받침 없으면 이를 줄인다: 의사다, 의사였다) */
export function koNoun(noun: string, form: KoForm): string {
  const b = hasBatchim(noun);
  const ga = b ? "이" : "가";
  switch (form) {
    case "plain":
      return b ? `${noun}이다` : `${noun}다`;
    case "polite":
      return `${noun}입니다`;
    case "past":
      return b ? `${noun}이었다` : `${noun}였다`;
    case "pastPolite":
      return b ? `${noun}이었습니다` : `${noun}였습니다`;
    case "neg":
      return `${noun}${ga} 아니다`;
    case "negPolite":
      return `${noun}${ga} 아닙니다`;
    case "pastNeg":
      return `${noun}${ga} 아니었다`;
    case "pastNegPolite":
      return `${noun}${ga} 아니었습니다`;
    case "go":
      return b ? `${noun}이고` : `${noun}고`;
    case "naru":
      return `${noun}${ga} 된다`;
    case "casual":
      return b ? `${noun}이야` : `${noun}야`;
    case "casualNeg":
      return `${noun}${ga} 아니야`;
    case "casualPast":
      return b ? `${noun}이었어` : `${noun}였어`;
    case "casualPastNeg":
      return `${noun}${ga} 아니었어`;
    default:
      throw new Error(`명사에는 ${form} 꼴을 쓰지 않음`);
  }
}
