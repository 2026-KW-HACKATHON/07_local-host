import { apiRequest } from './client';
import type {
  CreatePromotionRequest,
  Promotion,
  UpdatePromotionRequest,
} from './types';

const promotionsPath = (restaurantId: number) =>
  `/api/restaurants/${encodeURIComponent(String(restaurantId))}/promotions`;

export function createPromotion(
  restaurantId: number,
  request: CreatePromotionRequest,
  token: string,
): Promise<Promotion> {
  return apiRequest<Promotion>(promotionsPath(restaurantId), {
    method: 'POST',
    body: request,
    token,
  });
}

export function getActivePromotions(
  restaurantId: number,
): Promise<Promotion[]> {
  return apiRequest<Promotion[]>(promotionsPath(restaurantId));
}

export function getManagedPromotions(
  restaurantId: number,
  token: string,
): Promise<Promotion[]> {
  return apiRequest<Promotion[]>(`${promotionsPath(restaurantId)}/manage`, {
    token,
  });
}

export function updatePromotion(
  restaurantId: number,
  promotionId: number,
  request: UpdatePromotionRequest,
  token: string,
): Promise<Promotion> {
  const id = encodeURIComponent(String(promotionId));
  return apiRequest<Promotion>(`${promotionsPath(restaurantId)}/${id}`, {
    method: 'PUT',
    body: request,
    token,
  });
}

export function deletePromotion(
  restaurantId: number,
  promotionId: number,
  token: string,
): Promise<void> {
  const id = encodeURIComponent(String(promotionId));
  return apiRequest<void>(`${promotionsPath(restaurantId)}/${id}`, {
    method: 'DELETE',
    token,
  });
}
