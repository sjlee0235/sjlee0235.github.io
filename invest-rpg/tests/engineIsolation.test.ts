/// <reference types="vite/client" />
// 핵심 원칙 검사: 엔진(src/engine)은 순수 게임 규칙만 담고,
// 화면·외부 라이브러리·실제 시계·Math.random에 의존하지 않는다.
// (tsconfig.engine.json이 DOM 없이 컴파일되는지도 `npm run typecheck`에서 따로 확인한다.)

import { describe, expect, it } from 'vitest';

const sources = import.meta.glob('../src/engine/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

/** 주석을 지운 코드 (주석 속 설명 문구에 걸리지 않도록) */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const ALLOWED_IMPORT = /^(\.\/[\w-]+\.ts|\.\.\/data\/schema\.ts|\.\.\/data\/[\w-]+\.json)$/;
const FORBIDDEN_CODE: Array<[RegExp, string]> = [
  [/\bwindow\b/, 'window (브라우저)'],
  [/\bdocument\b/, 'document (브라우저)'],
  [/\blocalStorage\b/, 'localStorage (저장 기능)'],
  [/\bsetInterval\b|\bsetTimeout\b|\brequestAnimationFrame\b/, '실제 시계/타이머'],
  [/\bDate\.now\b|\bnew Date\b|\bperformance\.now\b/, '현재 시각'],
  [/\bMath\.random\b/, 'Math.random (시드 없는 난수)'],
  [/\bfetch\b/, '네트워크'],
];

describe('엔진 분리 원칙', () => {
  it('엔진 파일들을 찾았다', () => {
    expect(Object.keys(sources).length).toBeGreaterThanOrEqual(8);
  });

  for (const [path, raw] of Object.entries(sources)) {
    const code = stripComments(raw);

    it(`${path}: 엔진 내부 파일과 데이터 타입(schema.ts)만 import한다`, () => {
      const specifiers = [...code.matchAll(/\b(?:import|export)\b[^'"]*?\bfrom\s*['"]([^'"]+)['"]/g)].map(
        (m) => m[1]!,
      );
      const dynamic = [...code.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]!);
      for (const spec of [...specifiers, ...dynamic]) {
        expect(spec, `${path}에서 허용되지 않은 import: ${spec}`).toMatch(ALLOWED_IMPORT);
      }
    });

    it(`${path}: 화면·시계·무작위 난수를 쓰지 않는다`, () => {
      for (const [pattern, label] of FORBIDDEN_CODE) {
        expect(pattern.test(code), `${path}에서 ${label} 사용`).toBe(false);
      }
    });
  }
});
