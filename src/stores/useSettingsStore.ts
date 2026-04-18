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

const DEFAULT_MODEL = 'gemma-4-31b-it'

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      geminiApiKey: '',
      geminiModel: DEFAULT_MODEL,
      aiEnabled: true,
      setGeminiApiKey: (key) => set({ geminiApiKey: key }),
      setGeminiModel: (model) => set({ geminiModel: model }),
      setAiEnabled: (enabled) => set({ aiEnabled: enabled }),
      toggleAi: () => set((state) => ({ aiEnabled: !state.aiEnabled })),
      hasApiKey: () => get().geminiApiKey.trim().length > 0,
    }),
    {
      name: 'tw-stock-settings',
      version: 1,
      migrate: (persisted: any, version: number) => {
        if (version === 0) {
          // v0 → v1: 預設模型從 gemini-2.5-flash 改為 gemma-4-31b-it
          if (persisted.geminiModel === 'gemini-2.5-flash') {
            persisted.geminiModel = DEFAULT_MODEL
          }
        }
        return persisted
      },
    }
  )
)
