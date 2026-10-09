// 게임에 들어가는 시대 목록.
// 새 시대를 추가하려면: eras/ 폴더에 JSON 파일을 만들고 아래 배열에 한 줄 추가.
// 진행 순서는 각 JSON의 order 값으로 정해진다 (배열 순서와 무관).
//
// 현재: 새 데이터 구조(테마 풀 36개, 속보·잠정·결과)로 2000년대를 다시 쓰는 중 (단계 B).
// 이전 구조의 데이터는 legacy/2000s.v2.json에 참고용으로 보관 (게임에서 읽지 않음).

import type { Era } from '../schema.ts';

export const ALL_ERAS: readonly Era[] = [];
