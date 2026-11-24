import {
  ADJ_FORM_INFO,
  ADJ_FORMS,
  adjFormApplies,
  conjugateAdj,
} from "@/lib/ilmunta/adjective";
import {
  BASIC_FORMS,
  type Conjugation,
  conjugate,
  type Form,
  VERB_FORMS,
} from "@/lib/ilmunta/conjugate";
import { VERB_FORM_INFO } from "@/lib/ilmunta/forms";
import { VERBS } from "@/lib/ilmunta/verbs";
import { ADJECTIVES } from "@/lib/ilmunta/words";
import { normalizeJa } from "./match";

// 일문따 드릴 낱말(세션이 고른 기초 동사·형용사, 교재 글이 아니다)의 활용형을 모두 펼친 표.
// 강사가 그 과의 활용형을 즉석에서 말한 짧은 줄(食べさせられる 같은 것)을 알아보는 데 쓴다.
// 활용 엔진(lib/ilmunta)이 만든 꼴이라 표기와 읽는 법이 정확하다. 화면을 모르는 순수 함수다.

export interface ConjugatedForm {
  /** 활용한 꼴의 한자 표기와 히라가나 읽기 */
  kanji: string;
  reading: string;
  /** 사전형(드릴 낱말)과 그 뜻 */
  dict: string;
  dictReading: string;
  ko: string;
  /** 활용형 이름(예: 사역형)과 그 꼴의 한국어 틀(예: ~하게 하다) */
  label: string;
  formKo: string;
  /** 기술표(curriculum.ts)의 열쇠와 같은 꼴: `verb:<꼴>:<갈래>`·`adj:<꼴>:<갈래>` */
  skill: string;
}

function forms(c: Conjugation): Form[] {
  return [{ kanji: c.kanji, reading: c.reading }, ...c.alternatives];
}

function build(): ConjugatedForm[] {
  const out: ConjugatedForm[] = [];
  for (const v of VERBS)
    for (const form of VERB_FORMS) {
      if (v.basicOnly && !BASIC_FORMS.has(form)) continue;
      let c: Conjugation;
      try {
        c = conjugate(v, form);
      } catch {
        continue;
      }
      for (const f of forms(c))
        out.push({
          ...f,
          dict: v.dict,
          dictReading: v.reading,
          ko: v.ko,
          label: VERB_FORM_INFO[form].label,
          formKo: VERB_FORM_INFO[form].ko,
          skill: `verb:${form}:${v.group}`,
        });
    }
  for (const a of ADJECTIVES)
    for (const form of ADJ_FORMS) {
      if (!adjFormApplies(a.kind, form)) continue;
      for (const f of forms(conjugateAdj(a, form)))
        out.push({
          ...f,
          dict: a.dict,
          dictReading: a.reading,
          ko: a.ko,
          label: ADJ_FORM_INFO[form].label,
          formKo: ADJ_FORM_INFO[form].ko,
          skill: `adj:${form}:${a.kind}`,
        });
    }
  return out;
}

let table: ConjugatedForm[] | null = null;

/** 드릴 낱말의 모든 활용형(한 번만 만든다) */
export function conjugatedForms(): ConjugatedForm[] {
  table ??= build();
  return table;
}

let readings: Set<string> | null = null;

/** 활용형 읽기의 비교용 글(두 글자 이상). 가나 줄이 일본어로 설명되는지 잴 때 쓴다 */
export function conjugatedReadings(): Set<string> {
  readings ??= new Set(
    conjugatedForms()
      .map((f) => normalizeJa(f.reading))
      .filter((r) => [...r].length >= 2),
  );
  return readings;
}
