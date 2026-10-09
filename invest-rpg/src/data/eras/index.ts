// 게임에 들어가는 시대 목록.
// 새 시대를 추가하려면: eras/ 폴더에 JSON 파일을 만들고 아래 배열에 한 줄 추가.
// 진행 순서는 각 JSON의 order 값으로 정해진다 (배열 순서와 무관).
//
// TODO(W2 이후): 2010s.json, 2020s.json 추가. 나중에 1980s/1990s/2030s도 같은 방식.

import type { Era } from '../schema.ts';
import era2000s from './2000s.json' with { type: 'json' };

export const ALL_ERAS: readonly Era[] = [era2000s as Era];
