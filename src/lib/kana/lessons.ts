import { type CardId, cardId, type Script } from "./data";
import type { Mark } from "./text";

export interface Word {
  kana: string;
  meaning: string;
}

export interface Note {
  title: string;
  body: string;
  /** 보기 낱말(가나) */
  example?: string;
}

export interface Lesson {
  id: string;
  title: string;
  /** 지도에 짧게 보일 글자들 */
  glyphs: string;
  script: Script;
  /** 이 레슨에서 새로 배우는 소리 id */
  sounds: string[];
  /** 이 레슨에서 새로 배우는 표시(촉음·장음) */
  marks?: Mark[];
  notes?: Note[];
  /** 지금까지 배운 글자만으로 된 낱말 */
  words: Word[];
}

const ROW = {
  a: ["a", "i", "u", "e", "o"],
  k: ["ka", "ki", "ku", "ke", "ko"],
  s: ["sa", "shi", "su", "se", "so"],
  t: ["ta", "chi", "tsu", "te", "to"],
  n: ["na", "ni", "nu", "ne", "no"],
  h: ["ha", "hi", "fu", "he", "ho"],
  m: ["ma", "mi", "mu", "me", "mo"],
  y: ["ya", "yu", "yo"],
  r: ["ra", "ri", "ru", "re", "ro"],
  w: ["wa", "wo", "n"],
  g: ["ga", "gi", "gu", "ge", "go"],
  z: ["za", "ji", "zu", "ze", "zo"],
  d: ["da", "di", "du", "de", "do"],
  b: ["ba", "bi", "bu", "be", "bo"],
  p: ["pa", "pi", "pu", "pe", "po"],
};
const YOON_PLAIN = [
  "kya",
  "kyu",
  "kyo",
  "sha",
  "shu",
  "sho",
  "cha",
  "chu",
  "cho",
  "nya",
  "nyu",
  "nyo",
  "hya",
  "hyu",
  "hyo",
  "mya",
  "myu",
  "myo",
  "rya",
  "ryu",
  "ryo",
];
const YOON_VOICED = [
  "gya",
  "gyu",
  "gyo",
  "ja",
  "ju",
  "jo",
  "bya",
  "byu",
  "byo",
  "pya",
  "pyu",
  "pyo",
];

const w = (kana: string, meaning: string): Word => ({ kana, meaning });

export const LESSONS: Lesson[] = [
  // ── 히라가나 ──
  {
    id: "h1",
    title: "あ행 · か행",
    glyphs: "あいうえお かきくけこ",
    script: "hira",
    sounds: [...ROW.a, ...ROW.k],
    notes: [
      {
        title: "가나는 한 글자가 한 박",
        body: "히라가나는 글자 하나가 소리 한 박이다. 모음 다섯(あいうえお)을 먼저 익히고, 그 앞에 자음을 붙여 나간다.",
        example: "あい",
      },
    ],
    words: [
      w("あい", "사랑"),
      w("いえ", "집"),
      w("うえ", "위"),
      w("かお", "얼굴"),
      w("あか", "빨강"),
      w("あおい", "파랗다"),
      w("いけ", "연못"),
      w("えき", "역"),
      w("きく", "듣다"),
      w("こえ", "목소리"),
      w("おおきい", "크다"),
    ],
  },
  {
    id: "h2",
    title: "さ행 · た행",
    glyphs: "さしすせそ たちつてと",
    script: "hira",
    sounds: [...ROW.s, ...ROW.t],
    notes: [
      {
        title: "し·ち·つ는 소리가 바뀐다",
        body: "さ행의 し는 '시', た행의 ち는 '치', つ는 '쓰'로 읽는다. 로마자도 shi·chi·tsu로 적는다.",
        example: "ちかてつ",
      },
    ],
    words: [
      w("あさ", "아침"),
      w("いす", "의자"),
      w("かさ", "우산"),
      w("すし", "초밥"),
      w("した", "아래"),
      w("あした", "내일"),
      w("ちかい", "가깝다"),
      w("つくえ", "책상"),
      w("そと", "밖"),
      w("うた", "노래"),
      w("くつ", "신발"),
      w("たかい", "높다, 비싸다"),
      w("ちかてつ", "지하철"),
      w("おいしい", "맛있다"),
    ],
  },
  {
    id: "h3",
    title: "な행 · は행",
    glyphs: "なにぬねの はひふへほ",
    script: "hira",
    sounds: [...ROW.n, ...ROW.h],
    notes: [
      {
        title: "ふ는 '후'",
        body: "ふ는 입술을 살짝 모아 바람을 내는 '후'다. 로마자는 fu로 적는다.",
        example: "ふね",
      },
    ],
    words: [
      w("なつ", "여름"),
      w("ねこ", "고양이"),
      w("いぬ", "개"),
      w("はな", "꽃, 코"),
      w("ひと", "사람"),
      w("ふね", "배(타는 것)"),
      w("ほし", "별"),
      w("さかな", "생선"),
      w("なに", "무엇"),
      w("にく", "고기"),
      w("おかね", "돈"),
      w("ひとつ", "하나"),
      w("ふたつ", "둘"),
    ],
  },
  {
    id: "h4",
    title: "ま행 · や행",
    glyphs: "まみむめも やゆよ",
    script: "hira",
    sounds: [...ROW.m, ...ROW.y],
    words: [
      w("やま", "산"),
      w("ゆき", "눈(내리는 것)"),
      w("みみ", "귀"),
      w("め", "눈(보는 것)"),
      w("むし", "벌레"),
      w("もも", "복숭아"),
      w("うみ", "바다"),
      w("ゆめ", "꿈"),
      w("あめ", "비"),
      w("くも", "구름"),
      w("へや", "방"),
      w("やすみ", "쉬는 날"),
      w("よむ", "읽다"),
      w("さむい", "춥다"),
      w("みせ", "가게"),
    ],
  },
  {
    id: "h5",
    title: "ら행 · わ행 · ん",
    glyphs: "らりるれろ わをん",
    script: "hira",
    sounds: [...ROW.r, ...ROW.w],
    notes: [
      {
        title: "を는 조사로만",
        body: "を는 '~을/를'을 뜻하는 조사로만 쓰고, 소리는 お와 같은 '오'다. 입력기에서는 wo로 친다.",
        example: "ほんをよむ",
      },
      {
        title: "ん은 받침",
        body: "ん은 홀로 한 박을 차지하는 받침 소리다. 뒤 소리에 따라 ㄴ·ㅁ·ㅇ처럼 들린다.",
        example: "にほん",
      },
    ],
    words: [
      w("さくら", "벚꽃"),
      w("よる", "밤"),
      w("くるま", "자동차"),
      w("はる", "봄"),
      w("いろ", "색"),
      w("わたし", "나, 저"),
      w("ほん", "책"),
      w("にほん", "일본"),
      w("みかん", "귤"),
      w("くすり", "약"),
      w("せんせい", "선생님"),
      w("てんき", "날씨"),
      w("ほんをよむ", "책을 읽다"),
      w("おふろ", "목욕"),
    ],
  },
  {
    id: "h6",
    title: "탁음 が행 · ざ행",
    glyphs: "がぎぐげご ざじずぜぞ",
    script: "hira",
    sounds: [...ROW.g, ...ROW.z],
    notes: [
      {
        title: "점 두 개(゛)는 탁한 소리",
        body: "か에 점 두 개를 찍으면 が(가), さ에 찍으면 ざ(자)가 된다. 새 글자가 아니라 이미 아는 글자에 점만 더한 것이다.",
        example: "かぎ",
      },
    ],
    words: [
      w("かぎ", "열쇠"),
      w("めがね", "안경"),
      w("ごはん", "밥"),
      w("かぜ", "바람, 감기"),
      w("みず", "물"),
      w("ちず", "지도"),
      w("かぞく", "가족"),
      w("げんき", "기운, 건강"),
      w("じかん", "시간"),
      w("かんじ", "한자"),
      w("なぜ", "왜"),
      w("しずか", "조용함"),
      w("ぎんこう", "은행"),
    ],
  },
  {
    id: "h7",
    title: "탁음 だ·ば행 · 반탁음 ぱ행",
    glyphs: "だぢづでど ばびぶべぼ ぱぴぷぺぽ",
    script: "hira",
    sounds: [...ROW.d, ...ROW.b, ...ROW.p],
    notes: [
      {
        title: "동그라미(゜)는 ㅍ 소리",
        body: "は행에 점 두 개를 찍으면 ば(바), 작은 동그라미를 달면 ぱ(파)가 된다.",
        example: "さんぽ",
      },
      {
        title: "ぢ·づ는 드물다",
        body: "ぢ·づ는 じ·ず와 소리가 같아 몇몇 낱말에만 나온다. 보면 알아보는 정도면 된다.",
        example: "はなぢ",
      },
    ],
    words: [
      w("でんわ", "전화"),
      w("まど", "창문"),
      w("からだ", "몸"),
      w("ことば", "말, 낱말"),
      w("えんぴつ", "연필"),
      w("さんぽ", "산책"),
      w("ぶた", "돼지"),
      w("へび", "뱀"),
      w("かばん", "가방"),
      w("たんぽぽ", "민들레"),
      w("どこ", "어디"),
      w("てんぷら", "튀김"),
      w("でぐち", "출구"),
      w("はなぢ", "코피"),
    ],
  },
  {
    id: "h8",
    title: "요음 · 장음",
    glyphs: "きゃ しゅ ちょ にゃ ひゅ みょ りゃ",
    script: "hira",
    sounds: YOON_PLAIN,
    marks: ["chouon"],
    notes: [
      {
        title: "작은 ゃゅょ는 한 박으로",
        body: "き 뒤에 작게 쓴 ゃ를 붙이면 '키야'가 아니라 한 박의 '캬'가 된다. 글자 크기를 잘 본다.",
        example: "おちゃ",
      },
      {
        title: "장음: 모음을 겹쳐 길게",
        body: "おかあさん처럼 같은 모음이 이어지면 한 박 더 길게 끈다. えい·おう는 보통 '에-'·'오-'로 길게 읽는다.",
        example: "おかあさん",
      },
    ],
    words: [
      w("きょう", "오늘"),
      w("しゃしん", "사진"),
      w("おちゃ", "차(마시는 것)"),
      w("いしゃ", "의사"),
      w("ひゃく", "백(100)"),
      w("りょこう", "여행"),
      w("しゅくだい", "숙제"),
      w("とうきょう", "도쿄"),
      w("きゅうり", "오이"),
      w("かいしゃ", "회사"),
      w("りょうり", "요리"),
      w("おかあさん", "어머니"),
      w("おとうさん", "아버지"),
      w("おねえさん", "언니, 누나"),
      w("おにいさん", "오빠, 형"),
    ],
  },
  {
    id: "h9",
    title: "탁음 요음 · 촉음 っ",
    glyphs: "ぎゃ じゅ びょ ぴゃ っ",
    script: "hira",
    sounds: YOON_VOICED,
    marks: ["sokuon"],
    notes: [
      {
        title: "작은 っ는 한 박 쉬기",
        body: "작게 쓴 っ는 소리 없이 한 박을 멈춘다. 다음 자음을 미리 물고 있는 느낌으로, きって는 '킷테'에 가깝다.",
        example: "きって",
      },
    ],
    words: [
      w("じゅぎょう", "수업"),
      w("ぎゅうにゅう", "우유"),
      w("びょういん", "병원"),
      w("きって", "우표"),
      w("がっこう", "학교"),
      w("ざっし", "잡지"),
      w("ちょっと", "조금"),
      w("きっぷ", "표(승차권)"),
      w("いっしょ", "함께"),
      w("みっつ", "셋"),
      w("じゃあね", "그럼 안녕"),
      w("はっぴゃく", "팔백(800)"),
    ],
  },
  // ── 가타카나 ──
  {
    id: "k1",
    title: "ア행 · カ행 · ー",
    glyphs: "アイウエオ カキクケコ ー",
    script: "kata",
    sounds: [...ROW.a, ...ROW.k],
    marks: ["chouon"],
    notes: [
      {
        title: "가타카나는 외래어 글자",
        body: "소리는 히라가나와 똑같고 모양만 다르다. 주로 외래어·의성어에 쓴다. 각진 획이 많다.",
        example: "ココア",
      },
      {
        title: "ー는 길게",
        body: "가타카나에서는 긴 소리를 ー로 적는다. ケーキ는 '케-키'.",
        example: "ケーキ",
      },
    ],
    words: [
      w("ココア", "코코아"),
      w("カカオ", "카카오"),
      w("キウイ", "키위"),
      w("ケーキ", "케이크"),
      w("エコ", "에코, 친환경"),
    ],
  },
  {
    id: "k2",
    title: "サ행 · タ행",
    glyphs: "サシスセソ タチツテト",
    script: "kata",
    sounds: [...ROW.s, ...ROW.t],
    notes: [
      {
        title: "シ와 ツ",
        body: "シ는 점이 왼쪽에 세로로 놓이고 마지막 획을 아래에서 위로 쓸어 올린다. ツ는 점이 위에 나란히 놓이고 마지막 획을 위에서 아래로 내린다.",
        example: "スーツ",
      },
    ],
    words: [
      w("タクシー", "택시"),
      w("テスト", "시험"),
      w("スキー", "스키"),
      w("ソース", "소스"),
      w("セーター", "스웨터"),
      w("トースト", "토스트"),
      w("テキスト", "교재"),
      w("ケース", "케이스"),
      w("スーツ", "정장"),
    ],
  },
  {
    id: "k3",
    title: "ナ행 · ハ행",
    glyphs: "ナニヌネノ ハヒフヘホ",
    script: "kata",
    sounds: [...ROW.n, ...ROW.h],
    words: [
      w("ナイフ", "칼(나이프)"),
      w("ノート", "공책"),
      w("コーヒー", "커피"),
      w("ネクタイ", "넥타이"),
      w("テニス", "테니스"),
      w("ハート", "하트"),
      w("ヒーター", "히터"),
      w("スニーカー", "운동화"),
      w("ホース", "호스"),
    ],
  },
  {
    id: "k4",
    title: "マ행 · ヤ행",
    glyphs: "マミムメモ ヤユヨ",
    script: "kata",
    sounds: [...ROW.m, ...ROW.y],
    words: [
      w("メモ", "메모"),
      w("ハム", "햄"),
      w("トマト", "토마토"),
      w("マスク", "마스크"),
      w("ユーモア", "유머"),
      w("ヨーヨー", "요요"),
      w("タイム", "기록 시간"),
      w("ミス", "실수"),
      w("ホーム", "승강장, 홈"),
    ],
  },
  {
    id: "k5",
    title: "ラ행 · ワ행 · ン",
    glyphs: "ラリルレロ ワヲン",
    script: "kata",
    sounds: [...ROW.r, ...ROW.w],
    notes: [
      {
        title: "ソ와 ン",
        body: "ソ는 마지막 획을 위에서 아래로, ン은 아래에서 위로 쓴다. 점의 기울기도 ソ는 세로, ン은 가로에 가깝다.",
        example: "ワイン",
      },
    ],
    words: [
      w("ラーメン", "라멘"),
      w("レモン", "레몬"),
      w("ホテル", "호텔"),
      w("カメラ", "카메라"),
      w("ワイン", "와인"),
      w("メロン", "멜론"),
      w("トイレ", "화장실"),
      w("アイスクリーム", "아이스크림"),
      w("レストラン", "식당"),
      w("ライオン", "사자"),
    ],
  },
  {
    id: "k6",
    title: "탁음 ガ행 · ザ행",
    glyphs: "ガギグゲゴ ザジズゼゾ",
    script: "kata",
    sounds: [...ROW.g, ...ROW.z],
    words: [
      w("ゲーム", "게임"),
      w("ガム", "껌"),
      w("チーズ", "치즈"),
      w("ジーンズ", "청바지"),
      w("サイズ", "크기"),
      w("ゴルフ", "골프"),
      w("ギター", "기타"),
      w("ラジオ", "라디오"),
      w("ゼロ", "영(0)"),
      w("グラス", "유리잔"),
      w("オレンジ", "오렌지"),
    ],
  },
  {
    id: "k7",
    title: "탁음 ダ·バ행 · 반탁음 パ행",
    glyphs: "ダヂヅデド バビブベボ パピプペポ",
    script: "kata",
    sounds: [...ROW.d, ...ROW.b, ...ROW.p],
    words: [
      w("テレビ", "텔레비전"),
      w("パン", "빵"),
      w("バス", "버스"),
      w("ドア", "문"),
      w("デパート", "백화점"),
      w("ビル", "빌딩"),
      w("ペン", "펜"),
      w("ピアノ", "피아노"),
      w("バナナ", "바나나"),
      w("ポスト", "우체통"),
      w("プール", "수영장"),
      w("ボタン", "단추"),
      w("パズル", "퍼즐"),
    ],
  },
  {
    id: "k8",
    title: "요음 · 촉음 ッ",
    glyphs: "キャ シュ チョ ニュ ジュ ピュ ッ",
    script: "kata",
    sounds: [...YOON_PLAIN, ...YOON_VOICED],
    marks: ["sokuon"],
    notes: [
      {
        title: "히라가나와 같은 규칙",
        body: "작은 ャュョ로 요음을, 작은 ッ로 한 박 쉬기를 적는다. 히라가나에서 익힌 규칙 그대로다.",
        example: "ジュース",
      },
    ],
    words: [
      w("シャツ", "셔츠"),
      w("ジュース", "주스"),
      w("メニュー", "메뉴"),
      w("ニュース", "뉴스"),
      w("キャベツ", "양배추"),
      w("チョコレート", "초콜릿"),
      w("コンピューター", "컴퓨터"),
      w("ベッド", "침대"),
      w("サッカー", "축구"),
      w("カップ", "컵"),
      w("チャンス", "기회"),
      w("ショッピング", "쇼핑"),
      w("キャンプ", "캠프"),
    ],
  },
  {
    id: "k9",
    title: "외래어 조합",
    glyphs: "ファ フィ フェ フォ ティ ディ ウィ ウェ シェ ジェ チェ",
    script: "kata",
    sounds: [
      "fa",
      "fi",
      "fe",
      "fo",
      "ti",
      "dhi",
      "wi",
      "we",
      "she",
      "je",
      "che",
    ],
    notes: [
      {
        title: "작은 ァィゥェォ",
        body: "일본어에 원래 없는 외래어 소리는 작은 ァィゥェォ를 붙여 적는다. フ + 작은 ァ = ファ(fa).",
        example: "カフェ",
      },
    ],
    words: [
      w("フォーク", "포크"),
      w("カフェ", "카페"),
      w("パーティー", "파티"),
      w("ソファ", "소파"),
      w("フィルム", "필름"),
      w("ウェブ", "웹"),
      w("シェフ", "요리사(셰프)"),
      w("ジェットコースター", "롤러코스터"),
      w("チェック", "확인(체크)"),
      w("メロディー", "멜로디"),
      w("ハロウィン", "핼러윈"),
      w("ファン", "팬"),
    ],
  },
];

export const LESSON_BY_ID: ReadonlyMap<string, Lesson> = new Map(
  LESSONS.map((l) => [l.id, l]),
);

/** 레슨에서 새로 생기는 카드 */
export function lessonCards(lesson: Lesson): CardId[] {
  return lesson.sounds.map((s) => cardId(lesson.script, s));
}

/** 이 레슨까지(포함) 배운 카드와 표시. 히라가나·가타카나 표시는 따로 센다. */
export function learnedThrough(lessonId: string): {
  cards: Set<CardId>;
  marks: Record<Script, Set<Mark>>;
} {
  const cards = new Set<CardId>();
  const marks: Record<Script, Set<Mark>> = { hira: new Set(), kata: new Set() };
  for (const lesson of LESSONS) {
    for (const c of lessonCards(lesson)) cards.add(c);
    for (const m of lesson.marks ?? []) marks[lesson.script].add(m);
    if (lesson.id === lessonId) return { cards, marks };
  }
  throw new Error(`없는 레슨: ${lessonId}`);
}

/** 끝낸 레슨 목록을 보고 다음에 할 레슨. 다 끝냈으면 null. */
export function nextLesson(completed: ReadonlySet<string>): Lesson | null {
  return LESSONS.find((l) => !completed.has(l.id)) ?? null;
}
