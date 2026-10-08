export type UserRole = 'CUSTOMER' | 'OWNER';

export interface User {
  id: number;
  email: string;
  nickname: string;
  role: UserRole;
}

export interface SignupRequest {
  email: string;
  password: string;
  nickname: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  user: User;
}

export interface RestaurantWriteRequest {
  name: string;
  address: string;
  openingTime: string;
  closingTime: string;
}

export type CreateRestaurantRequest = RestaurantWriteRequest;
export type UpdateRestaurantRequest = RestaurantWriteRequest;

export interface Restaurant extends RestaurantWriteRequest {
  id: number;
  ownerId: number;
}

export type ReportableCrowdLevel =
  | 'AVAILABLE'
  | 'FEW_SEATS'
  | 'LONG_WAIT';

export type CrowdLevel = ReportableCrowdLevel | 'UNKNOWN';

export interface ReportCrowdRequest {
  level: ReportableCrowdLevel;
}

export interface CrowdReportResponse {
  id: number;
  restaurantId: number;
  reporterId: number;
  level: ReportableCrowdLevel;
  label: string;
  reportedAt: string;
}

export interface CrowdStatusResponse {
  restaurantId: number;
  level: CrowdLevel;
  label: string;
  score: number;
  reportCount: number;
  updatedAt: string | null;
}

export interface CrowdChartPoint {
  time: string;
  level: CrowdLevel;
  label: string;
  score: number;
}

export interface CrowdChartResponse {
  restaurantId: number;
  start: string;
  end: string;
  data: CrowdChartPoint[];
}

export interface PromotionWriteRequest {
  title: string;
  description: string;
  discountPercent: number;
  startAt: string;
  endAt: string;
}

export type CreatePromotionRequest = PromotionWriteRequest;

export interface UpdatePromotionRequest extends PromotionWriteRequest {
  enabled: boolean;
}

export interface Promotion extends PromotionWriteRequest {
  id: number;
  restaurantId: number;
  enabled: boolean;
  active: boolean;
}
