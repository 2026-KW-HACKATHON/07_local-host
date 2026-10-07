import { apiRequest } from './client';
import type {
  CreateRestaurantRequest,
  Restaurant,
  UpdateRestaurantRequest,
} from './types';

const restaurantPath = (restaurantId: number) =>
  `/api/restaurants/${encodeURIComponent(String(restaurantId))}`;

export function createRestaurant(
  request: CreateRestaurantRequest,
  token: string,
): Promise<Restaurant> {
  return apiRequest<Restaurant>('/api/restaurants', {
    method: 'POST',
    body: request,
    token,
  });
}

export function getRestaurants(): Promise<Restaurant[]> {
  return apiRequest<Restaurant[]>('/api/restaurants');
}

export function getRestaurant(restaurantId: number): Promise<Restaurant> {
  return apiRequest<Restaurant>(restaurantPath(restaurantId));
}

export function updateRestaurant(
  restaurantId: number,
  request: UpdateRestaurantRequest,
  token: string,
): Promise<Restaurant> {
  return apiRequest<Restaurant>(restaurantPath(restaurantId), {
    method: 'PUT',
    body: request,
    token,
  });
}
