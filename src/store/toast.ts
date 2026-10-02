import { create } from 'zustand'

interface ToastStore {
  message: string | null
  show: (message: string) => void
  clear: () => void
}

export const useToast = create<ToastStore>()((set) => ({
  message: null,
  show: (message) => set({ message }),
  clear: () => set({ message: null }),
}))
