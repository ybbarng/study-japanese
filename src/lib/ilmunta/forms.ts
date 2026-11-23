import type { VerbFormId, VerbGroup } from "./conjugate";

/** 활용형 이름과 한국어로 옮긴 뜻(예: て형 — ~하고, ~해서) */
export const VERB_FORM_INFO: Record<VerbFormId, { label: string; ko: string }> =
  {
    dict: { label: "사전형", ko: "~하다(기본형)" },
    nai: { label: "ない형", ko: "~하지 않다" },
    nakatta: { label: "なかった형", ko: "~하지 않았다" },
    masu: { label: "ます형", ko: "~합니다" },
    masen: { label: "ません", ko: "~하지 않습니다" },
    mashita: { label: "ました", ko: "~했습니다" },
    masendeshita: { label: "ませんでした", ko: "~하지 않았습니다" },
    te: { label: "て형", ko: "~하고, ~해서" },
    ta: { label: "た형", ko: "~했다" },
    tara: { label: "たら형", ko: "~하면, ~했더니" },
    potential: { label: "가능형", ko: "~할 수 있다" },
    passive: { label: "수동형", ko: "~당하다, ~되다" },
    causative: { label: "사역형", ko: "~하게 하다, ~시키다" },
    causativePassive: { label: "사역수동형", ko: "(억지로) ~하게 되다" },
    volitional: { label: "의지형", ko: "~하자, ~해야지" },
    ba: { label: "ば형", ko: "~하면" },
    imperative: { label: "명령형", ko: "~해라" },
    prohibitive: { label: "금지형", ko: "~하지 마라" },
  };

export const GROUP_LABEL: Record<VerbGroup, string> = {
  godan: "1그룹",
  ichidan: "2그룹",
  suru: "3그룹 する",
  kuru: "3그룹 くる",
};
