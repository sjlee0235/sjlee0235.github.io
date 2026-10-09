// 게임에 들어가는 시대 목록.
// 새 시대를 추가하려면: eras/ 폴더에 JSON 파일을 만들고 아래 배열에 한 줄 추가.
// 진행 순서는 각 JSON의 order 값과 eraSequence.json(시대 진행 순서 데이터)으로 정해진다 (배열 순서와 무관).
//
// 현재: 2000년대 (단계 B 초안 — 기획자 검토 전). 2010년대·2020년대는 2000년대 검증 뒤에 작성.
// 이전 구조의 데이터는 legacy/2000s.v2.json에 참고용으로 보관 (게임에서 읽지 않음).

import type { Era } from '../schema.ts';
import eraSequenceData from '../eraSequence.json' with { type: 'json' };
import era2000s from './2000s.json' with { type: 'json' };

export const ALL_ERAS: readonly Era[] = [era2000s as Era];


/** 시대 진행 순서 (데이터: src/data/eraSequence.json). 마지막 시대가 끝나면 최종 요약 */
export const ERA_SEQUENCE: readonly string[] = eraSequenceData.sequence;

/** 시대 목록을 진행 순서대로 (순서에 없는 시대는 뺀다) */
export function orderBySequence<T extends { id: string }>(eras: readonly T[], sequence: readonly string[] = ERA_SEQUENCE): T[] {
  return sequence.flatMap((id) => eras.filter((e) => e.id === id));
}
