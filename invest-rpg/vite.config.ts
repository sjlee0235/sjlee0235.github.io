import { defineConfig } from 'vitest/config';

export default defineConfig({
  // 상대 경로로 빌드 → 어느 폴더(예: GitHub Pages의 /invest-rpg/)에 올려도 동작
  base: './',
  // assets/ 폴더(그림·음악)를 그대로 서비스: assets/art/bg/x.png → ./art/bg/x.png
  publicDir: 'assets',
  server: { port: 5173 },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
