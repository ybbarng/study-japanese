import { hasKanji } from "@/lib/ilmuta/ruby";
import { toHiragana } from "@/lib/kana/text";
import type { SongToken } from "./schema";

// 형태소 분석기(kuromoji, IPA 사전)의 결과 한 조각을 저장할 모양으로 줄인다.
// 분석기 자체는 analyzer.ts(서버 전용)가 띄우고, 여기는 순수 함수만 둔다.

/** kuromoji 조각에서 쓰는 필드만(모르는 값은 "*") */
export interface RawToken {
  surface_form: string;
  pos: string;
  pos_detail_1: string;
  basic_form: string;
  reading?: string;
}

function known(value: string | undefined): string | undefined {
  return value && value !== "*" ? value : undefined;
}

export function toSongToken(raw: RawToken): SongToken {
  const out: SongToken = { surface: raw.surface_form };
  const reading = known(raw.reading);
  if (reading && hasKanji(raw.surface_form)) {
    const hira = toHiragana(reading);
    if (hira !== raw.surface_form) out.reading = hira;
  }
  const base = known(raw.basic_form);
  if (base && base !== raw.surface_form) out.base = base;
  const pos = known(raw.pos);
  if (pos) out.pos = pos;
  const detail = known(raw.pos_detail_1);
  if (detail) out.posDetail = detail;
  return out;
}

/** 줄 하나를 조각으로 나누는 함수(서버가 분석기로 만든다) */
export type Tokenize = (text: string) => SongToken[];
