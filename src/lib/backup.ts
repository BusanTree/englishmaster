export const BACKUP_VERSION = 1

export interface BackupData {
  settings: Record<string, unknown>
  progress: Record<string, unknown>
  tutor: Record<string, unknown>
}

export interface BackupFile extends BackupData {
  app: 'englishmaster'
  version: number
  exportedAt: string
}

export function createBackup(data: BackupData, now: Date = new Date()): BackupFile {
  return { app: 'englishmaster', version: BACKUP_VERSION, exportedAt: now.toISOString(), ...data }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export type ParseResult = { ok: true; backup: BackupFile } | { ok: false; error: string }

export function parseBackup(text: string): ParseResult {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return { ok: false, error: 'JSON 파일이 아니에요.' }
  }
  if (!isRecord(value) || value.app !== 'englishmaster') return { ok: false, error: 'EnglishMaster 백업 파일이 아니에요.' }
  if (typeof value.version !== 'number' || value.version > BACKUP_VERSION) {
    return { ok: false, error: '이 앱보다 새 버전에서 만든 백업이에요.' }
  }
  if (!isRecord(value.settings) || !isRecord(value.progress) || !isRecord(value.tutor)) {
    return { ok: false, error: '백업 파일 일부가 손상됐어요.' }
  }
  return { ok: true, backup: value as unknown as BackupFile }
}

export function backupFileName(today: string): string {
  return `englishmaster-backup-${today}.json`
}
