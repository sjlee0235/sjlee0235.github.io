// Vite가 넣어 주는 값 (개발 서버면 DEV=true, 운영 빌드면 false → 디버그 패널 코드가 빌드에서 빠진다)
// VITE_PLAYTEST=1 로 빌드하면(npm run build:play) 시험판: ?debug=1 디버그 패널을 쓸 수 있다
interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly BASE_URL: string;
  readonly VITE_PLAYTEST?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.css';
