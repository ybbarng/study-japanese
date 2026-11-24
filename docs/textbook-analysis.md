# 교재 예문 낱말 분석

일무따 강 화면의 예문(문형·회화)과 강의 자막의 문장 카드에서 낱말을 누르면, 읽는 법·기본형·품사·뜻과 "일무따 n강에서 배움"이 뜬다. 그 낱말 정보가 이 분석 파일이다. 노래 분석(docs/song-analysis.md)과 같은 꼴이고, 같은 화면 경험을 준다.

## 지킬 것

- **분석 파일에는 교재 글자를 넣지 않는다.** 문장은 예문 mp3 id와 그 안 차례(`example`, `index`)와 지문(`hash`)으로, 낱말은 문장 안 글자 위치(`start`, `length`, 코드포인트 단위)로 가리킨다. 화면 글은 서버가 교재 문장에서 잘라 만든다.
- `content/textbook-analysis/`는 git 밖이다(`content/` 아래 교재 자료와 같이 서버에 rsync로 올린다).
- 교재 문장을 문서·커밋·테스트에 옮겨 적지 않는다. 테스트는 모양만 같은 지어낸 문장을 쓴다.

## 순서

1. 분석할 문장 자리 보기: `pnpm textbook:analysis-check ilmuta 3 --list` → 자리(`03-3#0`)·지문·글자 수
2. `content/textbook-analysis/ilmuta/<강>.json`을 아래 모양으로 쓴다. 회화 Basic·Advanced처럼 같은 글이 되풀이되면 한 번만 적어도 된다(지문이 같은 분석을 쓴다).
3. 확인: `pnpm textbook:analysis-check ilmuta 1-10` → 강마다 "맞음"이 나올 때까지. `--show`는 위치가 가리키는 낱말과 뜻을 찍는다(위치를 잘못 셌는지 볼 때).
4. 서버에 올리기: `rsync -av content/textbook-analysis/ byb.kr:data/study-ja/content/textbook-analysis/`. 화면이 요청 때마다 읽으므로 재배포 없이 보인다.

## 파일 모양

스키마 정본은 `src/lib/word-tap/analysis.ts`(zod). 모르는 필드는 받지 않는다.

```json
{
  "book": "ilmuta",
  "lesson": 1,
  "analyzedAt": "2026-11-24",
  "by": "claude",
  "sentences": [
    {
      "example": "01-3",
      "index": 0,
      "hash": "1a2b3c4d",
      "tokens": [
        { "start": 0, "length": 1, "reading": "やま", "pos": "名詞", "gloss": "산" },
        { "start": 1, "length": 1, "pos": "助詞", "gloss": "~은/는" }
      ],
      "grammar": [{ "pattern": "〜は〜だ", "explain": "~은 ~이다.", "ref": { "book": "ilmuta", "lesson": 1 } }]
    }
  ]
}
```

위 예의 낱말은 지어낸 문장 "山は山だ。"를 가리킨다. 낱말 필드(`reading`·`base`·`pos`·`gloss`)와 `grammar`의 뜻은 노래 분석과 같다. `by`는 분석한 쪽이다(`claude` 세션, `kuromoji` 형태소 분석기).

## 쓰는 기준

- 조사·조동사도 조각으로 둔다(초급자는 조사를 눌러 본다). 문장 부호만 조각에서 뺀다.
- `reading`은 한자가 든 낱말만. `base`는 활용해서 겉모양과 다를 때만(예: 行きます → 行く).
- `gloss`는 그 문장에서의 짧은 뜻. `grammar`는 그 강에서 배우는 문형에 `ref`로 그 강을 단다.

## 형태소 분석기로 넘길 때

나머지 강은 kuromoji로 자동화할 계획이다. kuromoji 결과(surface·pos·basic_form·reading)는 이 꼴로 그대로 옮겨진다: 문장 앞에서부터 surface 길이를 더해 `start`·`length`를, reading(가타카나)을 히라가나로 바꿔 한자가 든 낱말만 `reading`에, basic_form이 겉모양과 다르면 `base`에 둔다. `gloss`는 사전이나 세션이 채우고 `by`를 `kuromoji`로 적는다. 사람이 손본 강은 `claude`로 남긴다.
