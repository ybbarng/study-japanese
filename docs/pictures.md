# 그림(낱말 그림·장면 그림) 그리는 규칙

교재 낱말과 회화 장면에 세션이 직접 그린 색 그림(SVG)을 붙인다. 여러 서브에이전트가 범위를 나눠 그리므로 꼴과 규칙을 여기 하나로 둔다. 시험(`src/lib/pictures/*.test.ts`)이 규칙 대부분을 기계로 본다.

## 꼴

| 무엇 | 어디 |
| --- | --- |
| 낱말 그림 파일 | `public/pictures/words/<id>.svg` (64×64) |
| 장면 그림 파일 | `public/pictures/scenes/<id>.svg` (320×200) |
| 낱말 → 그림 id 표 | `src/lib/pictures/manifest/words-<범위>.ts` (`WORDS`) |
| 장면 열쇠 → 그림 표 | `src/lib/pictures/manifest/scenes-<범위>.ts` (`SCENES`, id와 설명) |
| 표 모으기 | `src/lib/pictures/index.ts`의 `WORD_MANIFESTS`·`SCENE_MANIFESTS`에 범위마다 한 줄 |
| 색 | `src/lib/pictures/palette.ts` (`PALETTE`) |
| 파일 검사 | `src/lib/pictures/check-svg.ts` |

- **범위**는 맡은 묶음 이름이다: `ilmuta-01-15`, `ilmuta-16-30`, `ilmunta-01-10` 처럼. 범위마다 표 파일을 따로 두어 서로 고치는 파일이 겹치지 않게 한다. `index.ts`에는 import 한 줄과 표 이름 한 줄만 더한다.
- **그림 id**는 뜻을 나타내는 영어 소문자·숫자·붙임표(`umbrella`, `office-worker`, `day-before-yesterday`). 장면 id는 장면 열쇠와 같게 둔다(`ilmuta-03-conversation`).
- **장면 열쇠**는 `<책>-<강 두 자리>-<장면>`: 책은 `ilmuta`·`ilmunta`, 장면은 `conversation`(회화)·`reading`(읽기 글). `sceneKey()`가 만든다.
- **낱말 키**는 교재 낱말의 기본형 그대로(`傘`, `かっこいい`). `～する`·`～な`는 뗀 꼴로도 찾으므로 `勉強`, `静か`만 적어도 `勉強する`, `静かな`에 붙는다.
- **한 낱말에 그림 하나.** 다른 범위 표에 이미 있는 낱말은 다시 넣지 않는다(시험이 막는다). 같은 그림을 여러 낱말이 써도 된다(`学生`·`生徒` → `student`).
- 그린 그림이 있으면 그림 문자(`src/lib/context/emoji.ts`)보다 먼저 쓴다. 그림 문자 표는 고치지 않아도 된다.
- 표에 없는 그림 파일, 파일이 없는 표 항목은 시험이 막는다.

## 화면에 붙는 곳

- 맥락 카드 낱말 칩: 서버가 카드를 만들 때 `picture`(그림 id)나 `emoji`를 붙이고, `PictureMark`가 그린다(`src/components/context/cue-card.tsx`).
- 일무따 단어 카드(뜻을 볼 때만), 회화에 나온 낱말: `WordPicture`.
- 일무따 회화 단계 맨 위: `ScenePicture`.
- 부품: `src/components/pictures/`
  - `<PictureMark picture={id} emoji={e} size={28} />` 이미 고른 그림(표를 불러오지 않음)
  - `<WordPicture ja="傘" size={48} />` 낱말로 찾아 그림
  - `<ScenePicture book="ilmuta" lessonNo={3} />` 장면

## 그리는 규칙

**무엇을 그리나**
- 그림만 보고 뜻이 바로 떠오르는 낱말: 사람·직업·물건·음식·동물·장소·탈것·날씨·몸·동작·느낌·때(달력·시계로 보일 수 있는 것)·위치(위·아래·안·밖, 가리키는 말의 거리).
- 정확성이 먼저다. 뜻이 둘 이상인데 그림이 한쪽만 보이면(高い 높다·비싸다) 둘을 한 그림에 담을 수 있을 때만 그린다. 아니면 그리지 않는다.
- 인사말·맞장구·문법어·순수 추상어(意味, 理由)는 그리지 않는다. 나라 이름은 국기 대신 그 나라를 잘못 드러낼 수 있어 그리지 않는다.
- 회화 장면은 강마다 하나: 누가 어디서 무엇을 하는지(장소·인물 수·핵심 물건·몸짓)를 그린다. 대사를 옮기지 않는다. 물음은 말풍선 속 `?` 모양(선으로 그린 것)으로만.
- 사람은 남녀·나이·차림으로 구분되게 그리되, 특정 실존 인물·캐릭터를 닮게 그리지 않는다.

**크기와 선**
- 낱말: `viewBox="0 0 64 64"`, 그림은 가장자리 4px 안쪽에. 화면에서 20~56px로 줄어 보이므로 큰 덩어리로 그리고 잔선은 줄인다.
- 장면: `viewBox="0 0 320 200"`. 인물은 키 100~140 정도로 크게.
- 선 굵기: 낱말 윤곽 2(잔선 1.5~2), 장면 윤곽 2.5. `stroke-linecap="round"`, `stroke-linejoin="round"`를 권한다.
- 크기 상한: 낱말 6KB, 장면 30KB.

**색** — 그림은 `<img>`로 붙어 화면 CSS를 받지 못하므로 `palette.ts` 색만 파일에 적는다.
- 배경은 투명. 바탕 네모를 깔지 않는다(화면 카드 색이 바탕이 된다).
- 어두운 화면(#0e1220)과 밝은 화면(#ffffff) 둘 다에서 보여야 한다. 그래서
  - 윤곽·입·눈썹·잔선은 `line`(#7a6a62, 두 바탕 모두와 3:1 넘게 대비).
  - 밝은 색(`white`, `cream`, `skin`)으로 칠한 덩어리에는 `line` 윤곽을 두른다(밝은 화면에서 묻힌다).
  - 아주 어두운 색은 없다. `eye`는 피부 위 눈동자 같은 작은 점에만.
- 큰 덩어리는 중간 밝기 색(`red`, `blue`, `green`, `purple`, `orange`, `teal`, `brown`)으로 칠하면 두 바탕에서 모두 잘 보인다. 같은 색 덩어리가 겹치면 `…Dark` 색으로 나눈다(옷 위 팔 등).
- 그림자·땅은 `grayDark`에 `fill-opacity="0.45"`.

**쓰지 않는 것**(시험이 막는다)
- `<text>`·글자(교재 글 옮기기, 글꼴 문제), `<image>`·바깥 주소, `<script>`, `<style>`·`style=`, 그러데이션·필터·마스크, `url()`.
- 루트 `<svg>`의 `width`·`height`(화면이 크기를 정한다).
- **모든 도형(path·circle·ellipse·rect·polygon·polyline)에 `fill`을 적는다.** 빠지면 검정으로 채워져 어두운 화면에서 사라진다. 선만이면 `fill="none"`.
- 팔레트 밖 색(이름 색 `black`·`white` 포함).

**교재 글**: 표·설명·주석·커밋에 교재 문장을 옮기지 않는다. 낱말 하나와 그림 id의 짝은 괜찮다. 장면 설명(`label`)은 세션이 쓴 한 문장으로.

## 본보기 셋

- 물건 `public/pictures/words/umbrella.svg` (傘): 빨간 덮개에 `line` 윤곽, 살은 `redDark`, 손잡이는 `brown` 굵은 선. 덩어리 하나와 굵은 선 두세 개.
- 사람 `public/pictures/words/singer.svg` (歌手): 둥근 얼굴(`skin` + `line` 윤곽), 머리 `hair`, 옷 `purple`, 눈은 `eye` 곡선, 입 `redDark`. 직업은 들고 있는 물건(마이크)과 기호(음표)로 보인다.
- 장면 `public/pictures/scenes/ilmuta-03-conversation.svg` (3강 회화): 두 인물을 좌우에 크게, 가운데 탁자 위 핵심 물건(가방), 왼쪽 인물이 우산을 내밀고 말풍선에 `?`. 뒤 창문으로 실내임을 보인다. 바닥 그림자로 땅을 잡는다.

## 그린 뒤 확인

1. `pnpm test:run src/lib/pictures` — 파일 규칙·표 짝이 맞는지.
2. 눈으로 보기: 어두운 바탕과 흰 바탕에 그림을 늘어놓고 찍어 본다(Playwright로 data URI를 `<img>`에 넣어 찍으면 된다). 작게(28px) 줄였을 때도 무엇인지 알아보이는지 본다.
3. `CONTENT_DIR=<content 폴더> pnpm context:report`의 "그림 붙은 칩" 비율.
