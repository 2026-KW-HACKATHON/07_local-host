import { Directory, File, Paths } from 'expo-file-system';
import { API_BASE_URL } from '../config/api';
import { koreaObservationTime } from './analytics';
import { assertOwnerIds, ownerServerKey } from './draftModel';
import { validateOwnerReport, type StoredOwnerReport } from './reportModel';

export type { StoredOwnerReport } from './reportModel';
export { OWNER_REPORT_DESCRIPTION_LIMIT } from './reportModel';

const serverKey = ownerServerKey(API_BASE_URL);
const directoryFor = (userId: number, restaurantId: number) => new Directory(Paths.document, 'owner-reports', serverKey, String(userId), String(restaurantId));
let temporarySequence = 0;

export async function readOwnerReports(userId: number, restaurantId: number): Promise<StoredOwnerReport[]> {
  assertOwnerIds(userId, restaurantId);
  const directory = directoryFor(userId, restaurantId);
  if (!directory.exists) return [];
  const result: StoredOwnerReport[] = [];
  for (const entry of directory.list()) {
    // A terminated save can leave its unpublished temporary file. It is never a report.
    if (/^\.[1-9]\d*\.\d+-\d+\.tmp$/.test(entry.name)) continue;
    if (!(entry instanceof File) || !/^[1-9]\d*\.json$/.test(entry.name)) throw new Error('저장한 제보 파일을 확인해 주세요.');
    const report = validateOwnerReport(JSON.parse(await entry.text()), userId, restaurantId);
    if (entry.name !== `${report.id}.json`) throw new Error('저장한 제보 번호가 일치하지 않아요.');
    result.push(report);
  }
  return result.sort((a, b) => koreaObservationTime(b.reportedAt) - koreaObservationTime(a.reportedAt) || b.id - a.id);
}

/** Store only a successful server response; description is device-only, not sent by the current API. */
export async function writeOwnerReport(userId: number, restaurantId: number, value: StoredOwnerReport): Promise<void> {
  const report = validateOwnerReport(value, userId, restaurantId);
  const previous = await readOwnerReports(userId, restaurantId);
  const existing = previous.find(item => item.id === report.id);
  if (existing && (existing.reportedAt !== report.reportedAt || existing.level !== report.level || existing.label !== report.label)) {
    throw new Error('같은 번호의 기존 제보와 내용이 달라 저장하지 않았어요.');
  }
  const directory = directoryFor(userId, restaurantId);
  directory.create({ intermediates: true, idempotent: true });
  const target = new File(directory, `${report.id}.json`);
  const temporary = new File(directory, `.${report.id}.${Date.now()}-${++temporarySequence}.tmp`);
  const temporaryUri = temporary.uri;
  let published = false;
  try {
    temporary.write(JSON.stringify(report));
    // Installed Expo FileSystem supports async relocation with overwrite.
    await temporary.move(target, { overwrite: true });
    published = true;
  } finally {
    // move updates the File object's URI; never delete it after publication.
    if (!published) {
      try { if (temporary.uri === temporaryUri && temporary.exists) temporary.delete(); } catch { /* Keep a failed-save temporary file for recovery. */ }
    }
  }
}
