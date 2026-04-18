'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsStore {
  geminiApiKey: string
  geminiModel: string
  aiEnabled: boolean
  setGeminiApiKey: (key: string) => void
  setGeminiModel: (model: string) => void
  setAiEnabled: (enabled: boolean) => void
  toggleAi: () => void
  hasApiKey: () => boolean
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      geminiApiKey: '',
      geminiModel: 'gemma-4-31b-it',
      aiEnabled: true,
      setGeminiApiKey: (key) => set({ geminiApiKey: key }),
      setGeminiModel: (model) => set({ geminiModel: model }),
      setAiEnabled: (enabled) => set({ aiEnabled: enabled }),
      toggleAi: () => set((state) => ({ aiEnabled: !state.aiEnabled })),
      hasApiKey: () => get().geminiApiKey.trim().length > 0,
    }),
    { name: 'tw-stock-settings' }
  )
)
