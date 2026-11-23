import {
  isGodanException,
  isIku,
  lastKana,
  type Verb,
  type VerbFormId,
} from "./conjugate";

/**
 * 틀렸을 때 보여 줄 짧은 규칙. 동사의 갈래와 끝 글자에 맞춰 한 줄로 만든다.
 * 예: "む로 끝나는 1그룹 → む를 빼고 んで"
 */
export function ruleFor(v: Verb, form: VerbFormId): string {
  const base = baseRule(v, form);
  if (isGodanException(v))
    return `${v.dict}는 2그룹처럼 생겼지만 1그룹이다. ${base}`;
  return base;
}

const TE_GROUP: Record<string, string> = {
  う: "う·つ·る",
  つ: "う·つ·る",
  る: "う·つ·る",
  む: "む·ぶ·ぬ",
  ぶ: "む·ぶ·ぬ",
  ぬ: "む·ぶ·ぬ",
  く: "く",
  ぐ: "ぐ",
  す: "す",
};
const TE_END: Record<string, [string, string]> = {
  う·つ·る: ["って", "った"],
  む·ぶ·ぬ: ["んで", "んだ"],
  く: ["いて", "いた"],
  ぐ: ["いで", "いだ"],
  す: ["して", "した"],
};

function godanTeRule(v: Verb, which: 0 | 1, suffix = ""): string {
  if (isIku(v))
    return `行く는 예외: く로 끝나도 ${which === 0 ? "って" : "った"}${suffix}`;
  const end = lastKana(v);
  const group = TE_GROUP[end];
  return `${group}로 끝나는 1그룹 → ${end}를 빼고 ${TE_END[group][which]}${suffix}`;
}

function baseRule(v: Verb, form: VerbFormId): string {
  const end = lastKana(v);
  const g = v.group;
  switch (form) {
    case "dict":
      if (g === "godan") return "ます를 떼고 い단 글자를 う단으로(飲み → 飲む)";
      if (g === "ichidan") return "2그룹은 ます를 떼고 る를 붙인다";
      return g === "suru" ? "します → する" : "きます → くる";
    case "nai":
    case "nakatta": {
      const tail = form === "nai" ? "ない" : "なかった";
      if (g === "godan") {
        if (v.reading === "ある")
          return `ある의 부정은 ${tail}(あらない가 아님)`;
        return end === "う"
          ? `う로 끝나는 1그룹 → う를 わ로 바꾸고 ${tail}`
          : `1그룹 → 끝 글자를 あ단으로 바꾸고 ${tail}`;
      }
      if (g === "ichidan") return `2그룹 → る를 빼고 ${tail}`;
      return g === "suru"
        ? `する → し${tail}`
        : `くる → こ${tail}(こ로 바뀐다)`;
    }
    case "masu":
    case "masen":
    case "mashita":
    case "masendeshita": {
      const tail = {
        masu: "ます",
        masen: "ません",
        mashita: "ました",
        masendeshita: "ませんでした",
      }[form];
      if (g === "godan") return `1그룹 → 끝 글자를 い단으로 바꾸고 ${tail}`;
      if (g === "ichidan") return `2그룹 → る를 빼고 ${tail}`;
      return g === "suru"
        ? `する → し${tail}`
        : `くる → き${tail}(き로 바뀐다)`;
    }
    case "te":
    case "ta":
    case "tara": {
      const which = form === "te" ? 0 : 1;
      const suffix = form === "tara" ? "ら(た형 + ら)" : "";
      if (g === "godan") return godanTeRule(v, which, suffix);
      const t = which === 0 ? "て" : "た";
      if (g === "ichidan") return `2그룹 → る를 빼고 ${t}${suffix}`;
      return g === "suru" ? `する → し${t}${suffix}` : `くる → き${t}${suffix}`;
    }
    case "potential":
      if (g === "godan") return "1그룹 → 끝 글자를 え단으로 바꾸고 る";
      if (g === "ichidan") return "2그룹 → る를 빼고 られる";
      return g === "suru" ? "する의 가능형은 できる" : "くる → こられる";
    case "passive":
      if (g === "godan")
        return end === "う"
          ? "う로 끝나는 1그룹 → う를 わ로 바꾸고 れる"
          : "1그룹 → 끝 글자를 あ단으로 바꾸고 れる";
      if (g === "ichidan") return "2그룹 → る를 빼고 られる";
      return g === "suru" ? "する → される" : "くる → こられる";
    case "causative":
      if (g === "godan")
        return end === "う"
          ? "う로 끝나는 1그룹 → う를 わ로 바꾸고 せる"
          : "1그룹 → 끝 글자를 あ단으로 바꾸고 せる";
      if (g === "ichidan") return "2그룹 → る를 빼고 させる";
      return g === "suru" ? "する → させる" : "くる → こさせる";
    case "causativePassive":
      if (g === "godan")
        return end === "す"
          ? "1그룹 → 사역형(せる)의 る를 빼고 られる. す로 끝나면 줄인 꼴이 없다"
          : "1그룹 → 사역형(せる)의 る를 빼고 られる. 줄여서 あ단 + される도 쓴다";
      if (g === "ichidan") return "2그룹 → る를 빼고 させられる";
      return g === "suru" ? "する → させられる" : "くる → こさせられる";
    case "volitional":
      if (g === "godan") return "1그룹 → 끝 글자를 お단으로 바꾸고 う";
      if (g === "ichidan") return "2그룹 → る를 빼고 よう";
      return g === "suru" ? "する → しよう" : "くる → こよう";
    case "ba":
      if (g === "godan") return "1그룹 → 끝 글자를 え단으로 바꾸고 ば";
      if (g === "ichidan") return "2그룹 → る를 빼고 れば";
      return g === "suru" ? "する → すれば" : "くる → くれば";
    case "imperative":
      if (g === "godan") return "1그룹 → 끝 글자를 え단으로";
      if (g === "ichidan") return "2그룹 → る를 빼고 ろ";
      return g === "suru" ? "する → しろ(せよ)" : "くる → こい";
    case "prohibitive":
      return "모든 동사: 사전형 + な";
  }
}
