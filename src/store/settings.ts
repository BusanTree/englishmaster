import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Level } from '../content/types.ts'

export interface Settings {
  onboarded: boolean
  level: Level
  dailyGoal: number
  newPerDay: number
  /** speechSynthesis rate, 0.7..1.2 */
  ttsRate: number
  /** Chosen English voice; null picks a Google en-US voice automatically. */
  voiceURI: string | null
  /** Read AI tutor replies aloud as they arrive. */
  autoPlay: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  level: 1,
  dailyGoal: 50,
  newPerDay: 10,
  ttsRate: 1,
  voiceURI: null,
  autoPlay: true,
}

interface SettingsStore extends Settings {
  update: (patch: Partial<Settings>) => void
  replace: (settings: Settings) => void
  reset: () => void
}

export function pickSettings(s: Settings): Settings {
  return {
    onboarded: s.onboarded,
    level: s.level,
    dailyGoal: s.dailyGoal,
    newPerDay: s.newPerDay,
    ttsRate: s.ttsRate,
    voiceURI: s.voiceURI,
    autoPlay: s.autoPlay,
  }
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
      replace: (settings) => set(pickSettings({ ...DEFAULT_SETTINGS, ...settings })),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    { name: 'em:settings', version: 1 },
  ),
)
