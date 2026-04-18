import { GoogleGenerativeAI } from '@google/generative-ai'

const SCORE_PATTERN = /\[SCORE:\s*([+-]?\d+)\]/

const BULLET_PREFIXES = ['*', '-', '#', '>', '•']
const THINKING_KEYWORDS = [
  'draft ', 'question:', 'target:', 'language:', 'constraint:',
  'stock code:', 'company:', 'analysis:', 'reasoning:',
  'final answer:', 'answer:', 'output:',
]

function extractAiScore(text: string): number | null {
  const match = SCORE_PATTERN.exec(text)
  if (match) {
    const score = parseInt(match[1], 10)
    return Math.max(-100, Math.min(100, score))
  }
  return null
}

function extractFinalAnswer(text: string): { reasoning: string; aiScore: number | null } {
  if (!text) return { reasoning: '', aiScore: null }

  const raw = text.trim()
  const aiScore = extractAiScore(raw)

  // Remove [SCORE:X] tag from text
  const cleanedRaw = raw.replace(SCORE_PATTERN, '').trim()

  // Split into paragraphs separated by blank lines
  const paragraphs = cleanedRaw.split(/\n\s*\n/).filter((p) => p.trim())
  if (paragraphs.length === 0) return { reasoning: cleanedRaw, aiScore }

  function cleanParagraph(para: string): string {
    const out: string[] = []
    for (const line of para.split('\n')) {
      let stripped = line.trim()
      if (!stripped) continue

      // Strip surrounding quotes
      const quoteChars = ['"', "'", '\u300c', '\u300d', '\u300e', '\u300f']
      let unquoted = stripped
      for (const q of quoteChars) {
        if (unquoted.startsWith(q)) unquoted = unquoted.slice(1)
        if (unquoted.endsWith(q)) unquoted = unquoted.slice(0, -1)
      }
      if (unquoted !== stripped && unquoted) {
        stripped = unquoted
      }

      if (BULLET_PREFIXES.some((p) => stripped.startsWith(p))) continue
      const lower = stripped.toLowerCase()
      if (THINKING_KEYWORDS.some((k) => lower.startsWith(k))) continue
      out.push(stripped)
    }
    return out.join('\n').trim()
  }

  // Clean all paragraphs and join non-empty ones
  const cleanedParagraphs: string[] = []
  for (const para of paragraphs) {
    const cleaned = cleanParagraph(para)
    if (cleaned) cleanedParagraphs.push(cleaned)
  }

  if (cleanedParagraphs.length > 0) {
    return { reasoning: cleanedParagraphs.join('\n\n'), aiScore }
  }

  return { reasoning: cleanedRaw, aiScore }
}

function truncateReasoning(text: string, maxLen = 600): string {
  if (text.length <= maxLen) return text
  const separators = ['\u3002', '\uff0c', '\u3001'] // 。，、
  for (const sep of separators) {
    const idx = text.lastIndexOf(sep, maxLen)
    if (idx > 0) return text.slice(0, idx + 1)
  }
  return text.slice(0, maxLen - 3) + '...'
}

export interface GeminiAnalysisResult {
  reasoning: string
  aiScore: number | null
}

export async function analyzeStock({
  apiKey,
  model,
  prompt,
}: {
  apiKey: string
  model: string
  prompt: string
}): Promise<GeminiAnalysisResult> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const generativeModel = genAI.getGenerativeModel({ model })

  const result = await generativeModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 1024,
      topP: 0.9,
    },
  })

  const response = result.response
  const content = response.text().trim()

  if (!content) {
    throw new Error(`${model} returned empty response`)
  }

  const { reasoning, aiScore } = extractFinalAnswer(content)
  return {
    reasoning: truncateReasoning(reasoning),
    aiScore,
  }
}
