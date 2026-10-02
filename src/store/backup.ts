import { createBackup, type BackupFile } from '../lib/backup.ts'
import { EMPTY_PROGRESS, pickProgress, useProgress, type ProgressData } from './progress.ts'
import { DEFAULT_SETTINGS, pickSettings, useSettings, type Settings } from './settings.ts'
import { useTutor, type Conversation } from './tutor.ts'

/** Everything worth keeping, except the OpenRouter key. */
export function exportBackup(now: Date = new Date()): BackupFile {
  const tutor = useTutor.getState()
  return createBackup(
    {
      settings: { ...pickSettings(useSettings.getState()) },
      progress: { ...pickProgress(useProgress.getState()) },
      tutor: { model: tutor.model, conversations: tutor.conversations },
    },
    now,
  )
}

export function importBackup(backup: BackupFile): void {
  useSettings.getState().replace({ ...DEFAULT_SETTINGS, ...(backup.settings as Partial<Settings>), onboarded: true })
  useProgress.getState().replace({ ...EMPTY_PROGRESS, ...(backup.progress as Partial<ProgressData>) })
  const { model, conversations } = backup.tutor as { model?: unknown; conversations?: unknown }
  useTutor
    .getState()
    .replaceHistory(
      typeof model === 'string' ? model : useTutor.getState().model,
      Array.isArray(conversations) ? (conversations as Conversation[]) : [],
    )
}
