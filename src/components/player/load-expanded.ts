// 펼친 재생 화면 코드 덩어리를 불러온다. 재생 막대(now-playing)가 펼칠 때 쓰고,
// service worker 등록(service-worker-register)이 한가할 때 미리 불러 빌드 파일 캐시에 담아 둔다.
export const loadExpandedPlayer = () => import("./expanded-player");
