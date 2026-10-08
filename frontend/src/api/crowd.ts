import { apiRequest } from './client';
import type {
  CrowdChartResponse,
  CrowdReportResponse,
  CrowdStatusResponse,
  ReportCrowdRequest,
} from './types';

const crowdPath = (restaurantId: number) =>
  `/api/restaurants/${encodeURIComponent(String(restaurantId))}/crowd`;

export function reportCrowd(
  restaurantId: number,
  request: ReportCrowdRequest,
  token: string,
): Promise<CrowdReportResponse> {
  return apiRequest<CrowdReportResponse>(crowdPath(restaurantId), {
    method: 'POST',
    body: request,
    token,
  });
}

export function getCurrentCrowd(
  restaurantId: number,
): Promise<CrowdStatusResponse> {
  return apiRequest<CrowdStatusResponse>(crowdPath(restaurantId));
}

export function getCrowdChart(
  restaurantId: number,
  hours = 12,
): Promise<CrowdChartResponse> {
  return apiRequest<CrowdChartResponse>(
    `${crowdPath(restaurantId)}/chart?hours=${encodeURIComponent(String(hours))}`,
  );
}
