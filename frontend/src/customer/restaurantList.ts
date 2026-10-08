import type { CrowdStatusResponse, Promotion, Restaurant } from '../api/types';

export type RestaurantSummary = { restaurant: Restaurant; crowd: CrowdStatusResponse | null; promotions: Promotion[] | null; deviceCouponCount?: number };
export type RestaurantSort = '거리순' | '여유순' | '프로모션';
const rank = { AVAILABLE: 0, FEW_SEATS: 1, LONG_WAIT: 2, UNKNOWN: 3 };

export function distanceLabel(meters: number | undefined) {
  if (meters === undefined || !Number.isFinite(meters) || meters < 0) return '거리 확인 전';
  return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;
}

export function selectRestaurants(rows: RestaurantSummary[], query: string, sort: RestaurantSort, distances: Record<string, number>) {
  const text = query.trim().toLocaleLowerCase();
  const distance = (id: number) => {
    const value = distances[String(id)];
    return Number.isFinite(value) && value >= 0 ? value : Infinity;
  };
  return rows.filter(row => `${row.restaurant.name} ${row.restaurant.address}`.toLocaleLowerCase().includes(text)
      && (sort !== '프로모션' || activeBenefits(row.promotions).length > 0 || (row.deviceCouponCount ?? 0) > 0))
    .sort((a, b) => {
      if (sort === '여유순') {
        const difference = rank[a.crowd?.level ?? 'UNKNOWN'] - rank[b.crowd?.level ?? 'UNKNOWN'];
        if (difference) return difference;
      }
      const difference = distance(a.restaurant.id) - distance(b.restaurant.id);
      return Number.isFinite(difference) && difference !== 0 ? difference
        : distance(a.restaurant.id) < distance(b.restaurant.id) ? -1
          : distance(a.restaurant.id) > distance(b.restaurant.id) ? 1 : a.restaurant.id - b.restaurant.id;
    });
}

export function naverSearchUrls(query: string) {
  const text = query.trim();
  if (!text) return null;
  const encoded = encodeURIComponent(text);
  return { web: `https://m.map.naver.com/search2/search.naver?query=${encoded}` };
}

export function restaurantMapQuery(restaurant: Pick<Restaurant, 'address'>) {
  return restaurant.address.trim();
}

export function activeBenefits(promotions: Promotion[] | null, now = Date.now()) {
  return promotions?.filter(item => item.enabled && item.active && Date.parse(item.startAt) <= now && Date.parse(item.endAt) > now) ?? [];
}
