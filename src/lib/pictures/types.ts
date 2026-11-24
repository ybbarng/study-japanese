// 그림 표의 꼴. 그림 파일은 public/pictures/ 아래 SVG이고, 표는 낱말·장면을 파일 id로 잇는다.
// 자세한 규칙은 docs/pictures.md.

/** 그림 id: 영어 소문자·숫자·붙임표(`umbrella`, `ilmuta-03-conversation`). 파일 이름이 된다 */
export const PICTURE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** 낱말(기본형) → 낱말 그림 id(`public/pictures/words/<id>.svg`) */
export type WordPictureMap = Readonly<Record<string, string>>;

export interface ScenePicture {
  /** `public/pictures/scenes/<id>.svg` */
  id: string;
  /** 화면 읽기 프로그램이 읽을 장면 설명. 세션이 쓴 한국어 한 문장(교재 문장을 옮기지 않는다) */
  label: string;
}

/** 장면 열쇠(`sceneKey`) → 장면 그림 */
export type ScenePictureMap = Readonly<Record<string, ScenePicture>>;

export type Book = "ilmuta" | "ilmunta";
/** 강·과 안의 어느 장면인가: 회화(conversation), 읽기 글(reading) */
export type ScenePart = "conversation" | "reading";

/** 장면 열쇠: `ilmuta-03-conversation`(책-강 두 자리-장면) */
export function sceneKey(
  book: Book,
  lessonNo: number,
  part: ScenePart = "conversation",
): string {
  return `${book}-${String(lessonNo).padStart(2, "0")}-${part}`;
}
