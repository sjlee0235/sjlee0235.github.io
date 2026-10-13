// GitHub Pages(Jekyll)는 저장소의 .md 파일도 웹페이지로 만든다. 이때 Liquid라는 틀 문법을 먼저 읽어서
// 문서 안에 "{%" 나 "{{" 가 있으면 사이트 전체 배포가 실패한다 (10차에 기획서의 "{%}" 한 글자 때문에 PR #2부터 배포가 멈춰 있었다).
import { describe, expect, it } from 'vitest';

declare const process: {
  getBuiltinModule(id: 'node:fs'): {
    readFileSync(path: string, enc: 'utf8'): string;
    readdirSync(path: string, opts: { withFileTypes: true }): { name: string; isDirectory(): boolean }[];
  };
};
const fs = process.getBuiltinModule('node:fs');
const SKIP = new Set(['node_modules', 'shots', 'dist']);

function markdownFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name.startsWith('_') || SKIP.has(e.name)) continue;
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...markdownFiles(p));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

describe('GitHub Pages 배포가 멈추지 않게', () => {
  it('문서(.md)에 Liquid 틀 문법 "{%" · "{{" 가 없다', () => {
    const files = markdownFiles('.');
    expect(files.length).toBeGreaterThan(5);
    const bad: string[] = [];
    for (const f of files) {
      fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (line.includes('{%') || line.includes('{{')) bad.push(`${f}:${i + 1}`);
      });
    }
    expect(bad).toEqual([]);
  });

  it('휴대폰 브라우저의 강제 어두운 테마가 게임 색을 뒤집지 않게 "어두운 테마도 지원"이라고 알린다', () => {
    // "only light"는 크롬만 따르고 삼성 인터넷은 무시해서(11차), 삼성 인터넷도 따르는 "light dark" + prefers-color-scheme을 쓴다
    expect(fs.readFileSync('index.html', 'utf8')).toContain('<meta name="color-scheme" content="light dark" />');
    const css = fs.readFileSync('src/ui/style.css', 'utf8');
    expect(css).toContain(':root { color-scheme: light dark; }');
    expect(css).toContain('@media (prefers-color-scheme: dark) { :root { color-scheme: dark; } }');
  });
});
