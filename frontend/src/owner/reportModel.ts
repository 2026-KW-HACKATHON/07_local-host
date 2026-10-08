import type { CrowdReportResponse } from '../api/types';
import { koreaObservationTime } from './analytics';
import { assertOwnerIds } from './draftModel';

export type StoredOwnerReport = CrowdReportResponse & { description: string };
export const OWNER_REPORT_DESCRIPTION_LIMIT = 200;

export function validateOwnerReport(value: unknown, userId: number, restaurantId: number): StoredOwnerReport {
  assertOwnerIds(userId, restaurantId);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('저장한 제보 정보를 읽지 못했어요.');
  const report = value as StoredOwnerReport;
  if (!Number.isSafeInteger(report.id) || report.id < 1 || report.restaurantId !== restaurantId || report.reporterId !== userId ||
      !['AVAILABLE', 'FEW_SEATS', 'LONG_WAIT'].includes(report.level) ||
      typeof report.label !== 'string' || !report.label.trim() ||
      typeof report.description !== 'string' || report.description.length > OWNER_REPORT_DESCRIPTION_LIMIT ||
      typeof report.reportedAt !== 'string' || !Number.isFinite(koreaObservationTime(report.reportedAt))) {
    throw new Error('저장한 제보 정보가 올바르지 않아요. 기존 정보는 변경하지 않았어요.');
  }
  return { ...report };
}
