# 자막 교정 파일

교재와 맞추지 못한 자막 일본어 줄은 화면에 흐리게 "받아쓰기 — 정확하지 않을 수 있음"으로 보인다. Claude가 그 줄을 앞뒤 문맥으로 고치고 whisper로 소리를 다시 들어 확인한 결과를 **교정 파일**에 적으면, 서버가 자막을 내줄 때 반영한다. 이 문서는 교정 파일을 만드는 갈래가 지킬 꼴과, 서버가 어떤 줄을 어떻게 내주는지를 정한다.

- 자리: `content/transcripts-review/<book>/<item>.json` (git 밖, 교재에서 나온 글이라 서버에는 rsync로 옮긴다)
- 꼴의 정본(zod 스키마): `src/lib/context/review.ts`의 `transcriptReviewSchema`
- 반영 코드: `src/lib/context/review.ts`(판정), `src/lib/context/build.ts`(`contextTranscript`)
- 숫자 확인: `CONTENT_DIR=<content 폴더> pnpm context:report -- --items`의 "교정으로 올린 줄", "교정으로 한국어로 돌린 줄" 열. `--no-review`를 붙이면 교정 없이 센다(전후 비교)

## 꼴

```jsonc
{
  "book": "ilmuta",          // 자막 파일과 같아야 한다
  "item": "L03",             // 자막 파일과 같아야 한다
  "method": "…",             // 자유 글(어떻게 만들었나)
  "threshold": 0.85,         // 소리 확인의 닮음 기준(없으면 0.85)
  "lines": [
    {
      "start": 43, "end": 43.82,      // 지문: 원래 자막 구간의 시각
      "original": "…",                // 지문: 원래 자막 구간의 글(한 글자도 바꾸지 않고)
      "corrected": "…",               // 고친 글. korean-noise면 한국어 글(없으면 "")
      "reading": "…",                 // corrected의 읽는 법(히라가나, 부호 없이)
      "ko": "…",                      // corrected의 뜻
      "confidence": "high",           // high | mid | low
      "kind": "japanese",             // japanese | name | korean-noise | other | korean
      "audioVerified": true,          // whisper로 다시 들어 corrected가 맞다고 확인했나
      "audio": {
        "simPlain": 1,                // prompt 없이 다시 받아 적은 글이 corrected와 닮은 정도(0~1)
        "simOriginal": 0.5,           // 원래 받아 적은 글이 corrected와 닮은 정도(0~1)
        "spellingOnly": false         // 소리는 같고 표기만 고쳤나
      },
      "splitAt": 44.1,                // (선택) 일본어와 한국어가 섞인 줄: 두 말이 갈리는 시각
      "japaneseSide": "before",       // (선택) 일본어가 splitAt 앞(before, 없으면 이것)인지 뒤(after)인지
      "koreanPart": "…",              // (선택) 한국어 부분의 한국어 글(없으면 그 부분은 내주지 않는다)
      "why": "…", "listenNote": "…"   // 자유 글(사람이 읽는 까닭). 서버는 쓰지 않는다
    }
  ]
}
```

- 모르는 필드(`index`, `file`, `audio.prompted` 등)는 넣어도 된다. 서버는 위 필드만 확인한다.
- `index`는 믿지 않는다. 줄은 **지문(`start`·`end`·`original`)**으로 자막 구간을 찾는다. 시각은 소수 둘째 자리까지 같아야 하고, 글은 부호·빈칸을 빼고 견준다(옮겨 적다 끝의 「。」를 빠뜨린 줄이 실제로 있었다). 그래도 다르면 그 줄은 쓰지 않는다. 자막을 다시 받아 적으면 옛 교정은 저절로 무시된다.
- `splitAt`은 파일 처음부터 센 초이고, 그 줄의 `start`와 `end` 사이여야 한다(밖이면 나누지 않는다). 섞인 줄의 `corrected`·`reading`·`ko`는 일본어 부분만 적는다.
- 옛 이름 `jaSide: "ja-before" | "ja-after"`(일문따 1~28과 갈래)도 읽을 때 `japaneseSide: "before" | "after"`로 바꿔 받는다. 새로 쓰는 파일은 `japaneseSide`를 쓴다.
- 교재 글과 같은 줄만 고친다. 이미 소책자 문장과 맞은 줄은 교정해도 소책자 글이 이긴다.

## 서버가 내주는 방식

| 줄 | 내주는 모습 |
|---|---|
| `kind: korean-noise` | 일본어 줄로 내주지 않는다. `corrected`에 한글이 있으면 그 글을 한국어 줄로, 없으면 숨긴다 |
| `kind: korean` | 한국어 줄(예문 mp3의 뜻 줄, 강사 설명)의 받아쓰기 오타를 고친 글. `corrected`에 한글이 있으면 그 글로 바꾸고, 없으면 원래 줄 그대로. 일문따 `NN-1` 예문의 뜻 줄을 고치면 그 과 강의 카드의 뜻도 함께 바뀐다(카드 뜻이 그 줄에서 나온다) |
| `kind: other`, `corrected`에 한글이 있는 줄(자리말 뭐뭐·누구누구가 섞인 문형 설명) | 고친 글을 강사의 한국어 설명 줄로 보인다. 일본어 카드·읽는 법·낱말 칩은 붙이지 않는다 |
| `kind: other`, `corrected`가 비었거나 0.3초 미만 조각 | 헛것으로 보고 내주지 않는다 |
| 정상 카드로 올릴 줄(아래 기준) | 교재 카드와 같은 크기로 고친 글·읽는 법·뜻·낱말 칩을 보이고, "고쳐 받아 적은 글 — 교재와 다를 수 있음"을 작게 붙인다 |
| 그 밖의 `japanese`·`name` 줄 | 원래 글 그대로 흐린 받아쓰기 |
| `splitAt`이 있는 줄 | 일본어 부분(글은 `corrected`)과 한국어 부분(글은 `koreanPart`, 없으면 내주지 않음)으로 나눈다. `japaneseSide`가 `before`(기본)면 일본어가 `start`~`splitAt`, `after`면 `splitAt`~`end`. 일본어 부분도 아래 기준으로 올릴지 정하고, 올리지 않으면 고친 글을 흐린 받아쓰기로 보인다 |
| `splitAt`이 없는 섞인 줄 | 원래 글 그대로 흐린 받아쓰기 |

교정 파일과 상관없이, 앞 줄과 글이 같은 0.3초 미만 구간(세 글자 이상)은 꼬리 조각으로 보고 뺀다(`src/lib/transcript/hallucination.ts` `tailEchoIndexes`).

### 정상 카드로 올리는 기준

다음을 **모두** 지켜야 한다(`promotable`).

1. `kind`가 `japanese`나 `name`
2. `confidence`가 `high`
3. `audioVerified`가 `true` (소리 확인에 실패한 줄은 무엇이든 흐림 그대로)
4. `corrected`에 일본어 글자가 있고 한글이 없다
5. 읽는 법(`reading`, 없으면 `corrected`)이 가나 4글자 이상
6. 긍정·부정 대답 낱말(はい·いいえ·うん·ううん·ええ·いや 등)만 있는 줄이 아니다
7. 그리고 둘 중 하나
   - (a) `corrected`가 그 강·과의 교재 낱말이나 등장인물 이름과 정확히 같다(부호·공백만 빼고 견준다. 가나 종류는 같아야 한다)
   - (b) prompt 없는 whisper도 원래 글보다 `corrected`에 가까워졌다: `audio.simPlain > audio.simOriginal`. 표기만 고친 줄(`spellingOnly: true`)은 소리가 원래와 같으므로 `simPlain`이 `threshold` 이상이면 된다

카드 세부:

- 읽는 법은 `reading`을 한자 덩어리마다 나눠 단다. 가나 부분이 닻이 되고, 가나 없이 붙은 한자 덩어리는 낱말 표에 읽기가 있을 때만 가른다(`src/lib/context/reading-ruby.ts`). 가를 수 없으면 자리가 확인된 낱말의 읽기만 단다.
- 낱말 칩은 받아 적은 글과 같은 엄격한 확인을 거친다(`src/lib/context/word-bounds.ts`).
- 뜻은 `ko`를 그대로 쓴다. 비면 "뜻을 찾지 못한 문장"이 보인다.

### 카드 뜻과 바로 옆 강사 줄 맞추기

강의에서 카드 뜻과 앞뒤 강사 한국어 줄이 같은 뜻을 따로 받아 적어 낱말 하나만 다르면(닦게/닫게) 서버가 맞춘다(`src/lib/context/meaning-lines.ts`, `meaning.ts`의 `reconcileMeaning`).

- 나머지 말이 같고 한 자리만 다를 때만 본다(강사 줄 머리의 「아니,」, 된소리 하나 차이는 봐준다). 더 다르면(바꿔 말함) 건드리지 않는다.
- 증거가 있을 때만 바꾼다: 홀로 든 한글 낱자(ㅈ의), 일본어에 없는 숫자(2번 역), 일본어 글 속 낱말의 뜻을 품은 쪽(磨く 닦다 → 닦게). 소책자·교정 파일 카드는 카드를 믿고, 바른 글(소책자 뜻·낱말 뜻)에 나오는 말이면 강사 줄을 카드 쪽으로 맞춘다.
- 증거가 없으면 둘 다 그대로 둔다. 이런 곳은 이 교정 파일에 `kind: korean`으로 고친다.

## 만드는 갈래가 지킬 것

- `original`은 자막 파일의 글을 그대로 옮긴다(부호·빈칸 포함). 시각도 자막 파일의 값 그대로 둔다.
- 확신이 없으면 `mid`·`low`로 둔다. 흐린 받아쓰기로 남는 편이 틀린 글을 정답처럼 보이는 것보다 낫다.
- 한국어가 섞인 줄은 일본어 부분의 경계 시각을 소리로 확인했을 때만 `splitAt`과 `japaneseSide`를 적는다. 확인하지 못했으면 `why`·`listenNote`에만 적는다.
- 교재 글·자막 글은 저장소(코드·테스트·문서·커밋)에 옮기지 않는다(docs/standing-rules.md).
