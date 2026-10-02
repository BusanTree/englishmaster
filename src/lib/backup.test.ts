import { describe, expect, it } from 'vitest'
import { backupFileName, createBackup, parseBackup } from './backup.ts'

const data = { settings: { level: 2 }, progress: { words: {} }, tutor: { conversations: [] } }

describe('backup', () => {
  it('round-trips through JSON', () => {
    const file = createBackup(data, new Date('2026-10-02T00:00:00Z'))
    const parsed = parseBackup(JSON.stringify(file))
    expect(parsed).toEqual({ ok: true, backup: file })
    expect(file).toMatchObject({ app: 'englishmaster', version: 1, exportedAt: '2026-10-02T00:00:00.000Z' })
  })

  it('rejects text that is not JSON', () => {
    expect(parseBackup('hello')).toEqual({ ok: false, error: 'JSON 파일이 아니에요.' })
  })

  it('rejects files from other apps or newer versions', () => {
    expect(parseBackup(JSON.stringify({ ...data, app: 'other', version: 1 }))).toMatchObject({ ok: false })
    expect(parseBackup(JSON.stringify({ ...data, app: 'englishmaster', version: 99 }))).toMatchObject({ ok: false })
  })

  it('rejects files with a missing section', () => {
    const broken = { app: 'englishmaster', version: 1, exportedAt: '', settings: {}, progress: {} }
    expect(parseBackup(JSON.stringify(broken))).toEqual({ ok: false, error: '백업 파일 일부가 손상됐어요.' })
  })

  it('names files by day', () => {
    expect(backupFileName('2026-10-02')).toBe('englishmaster-backup-2026-10-02.json')
  })
})
