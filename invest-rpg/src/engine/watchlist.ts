// 즐겨찾기(별표)와 종목 목록 정렬.
//
// favorites 배열은 "그룹 맨 위 → 아래" 순서로 저장한다.
// - 별을 누르면(또는 매수로 자동 추가되면) 맨 앞에 들어간다 = 즐겨찾기 그룹 맨 위.
// - 이미 즐겨찾기인 종목을 매수하면 위치를 바꾸지 않는다.
// 목록은 즐겨찾기 그룹이 항상 위, 나머지는 기본 순서(데이터 순서)를 따른다.

/** 즐겨찾기에 추가 (이미 있으면 그대로). 새 배열을 돌려준다 */
export function addFavorite(favorites: readonly string[], stockId: string): string[] {
  if (favorites.includes(stockId)) return [...favorites];
  return [stockId, ...favorites];
}

export function removeFavorite(favorites: readonly string[], stockId: string): string[] {
  return favorites.filter((id) => id !== stockId);
}

/** 별 누르기: 없으면 맨 위에 추가, 있으면 해제 */
export function toggleFavorite(favorites: readonly string[], stockId: string): string[] {
  return favorites.includes(stockId) ? removeFavorite(favorites, stockId) : addFavorite(favorites, stockId);
}

/**
 * 즐겨찾기 우선 정렬.
 * @param items 기본 순서대로 놓인 목록
 * @param getId 항목에서 종목 id를 꺼내는 함수
 */
export function sortByFavorites<T>(
  items: readonly T[],
  favorites: readonly string[],
  getId: (item: T) => string,
): T[] {
  const rank = new Map(favorites.map((id, i) => [id, i]));
  const favs = items.filter((it) => rank.has(getId(it)));
  const rest = items.filter((it) => !rank.has(getId(it)));
  favs.sort((a, b) => rank.get(getId(a))! - rank.get(getId(b))!);
  return [...favs, ...rest];
}
