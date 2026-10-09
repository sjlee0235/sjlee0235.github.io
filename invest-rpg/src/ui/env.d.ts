// Vite가 넣어 주는 값 (개발 서버면 DEV=true, 운영 빌드면 false → 디버그 패널 코드가 빌드에서 빠진다)
interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly BASE_URL: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.css';
