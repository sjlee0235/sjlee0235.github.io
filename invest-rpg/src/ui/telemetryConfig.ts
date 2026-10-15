// 플레이 기록을 받을 곳 (18차). 구글 스프레드시트에 붙인 Apps Script 웹 앱 주소 (tools/telemetry_apps_script.gs, docs/telemetry.md 9장).
// 비어 있으면 보내지 않고 기기에만 쌓아 둔다 (주소를 넣고 다시 배포하면 다음 접속 때 쌓인 것까지 보낸다).
export const TELEMETRY_ENDPOINT = '';

/** 기록에 붙는 배포 이름. 밸런스·화면을 바꿔 다시 배포할 때 올리면 전후 기록을 나눠 볼 수 있다 */
export const TELEMETRY_BUILD = '18차';

/** 실제로 보내는 곳: GitHub Pages(지인 플레이)만. 개발 서버·디버그·아티팩트 미리보기는 보내지 않는다 */
export function shouldSendTelemetry(hostname: string, debug: boolean): boolean {
  return !debug && hostname.endsWith('github.io');
}
