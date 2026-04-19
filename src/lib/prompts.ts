import type { SignalScore, Fundamentals, NewsItem } from '@/types/signal'

export const SYSTEM_PROMPT = `你是一位專業的台灣股票分析師，擅長綜合技術面、籌碼面、基本面與即時新聞做判斷。
你會收到：
- 15 大分析訊號（技術面、籌碼面、大盤連動等，每個已計算 -100 到 +100 分數）及加權總分
- 關鍵基本面數據（PE、EPS、殖利率、52 週區間等）
- 近期 5 則該股相關新聞標題
- 預測區間

你的任務：
1. 綜合技術面、籌碼面、大盤、基本面、新聞五方面，判斷該股在指定區間的走勢方向
2. 用繁體中文輸出 150 字內的推論說明，直接切入重點，不使用 emoji
3. 明確指出哪個因素最關鍵（技術動能／籌碼動向／大盤環境／估值／新聞事件）
4. 若出現訊號衝突（例如技術面偏多但籌碼偏空，或法人買超但RSI超買），必須點出矛盾並給出權衡
5. 籌碼面判讀指引：
   - 三大法人（尤其外資、投信）連續買超 → 中長線偏多
   - 法人賣超但技術面強 → 短線或許可持有，但注意風險
   - 融資大增且股價漲 → 散戶追多，留意回檔
   - 融券大增 → 可能有軋空機會
6. 考量區間長短：
   - 短線（1日/3日）：以動能、RSI、KD、盤中買賣壓、量價結構為主
   - 中線（1週/2週）：技術面 + 籌碼面 + 大盤連動 + 新聞事件
   - 長線（1個月）：基本面估值 + 籌碼趨勢 + 產業趨勢 + 新聞催化
7. 市場狀態判讀（極重要）：
   - 若市場狀態為「週末休市」或「盤後」：你分析的數據是最後一個交易日的收盤數據，請以**前瞻視角**分析，預估下一個交易日（通常是週一）的開盤走勢
   - 週末分析重點：上週五收盤走勢、法人上週動向、國際市場（費半指數）週五表現、週末是否有重大新聞
   - 盤後分析重點：當日收盤總結 + 預估隔日走勢
   - 盤中分析：即時走勢判斷
   - 分析文字應明確反映時間情境，例如「目前為週末休市，綜合上週五收盤走勢與國際盤表現，預估週一...」
8. 如果某類資料為「無資料」，就略過該面向判斷，並註明資訊不完整

輸出規則（極度重要）：
- 直接輸出最終分析文字，不要輸出任何思考過程、草稿、問題拆解、bullet points 或中間推理步驟
- 不要輸出 "Draft 1:"、"Question:"、"Target:"、"Constraint:"、"Analysis:" 這類標記
- 不要用星號 (*)、井號 (#)、減號 (-) 開頭條列
- 全程使用繁體中文，禁止使用英文（技術指標名稱如 RSI、MACD、KD 可保留英文縮寫）
- 輸出一段完整、連貫的繁體中文摘要分析（約 150~200 字），不要只擷取片段
- 必須綜合考量全部 15 個訊號（技術面 9 個 + 籌碼面、量價、大盤、均線、波動率、時間因子各 1 個），並在分析中體現關鍵訊號的判讀
- 分析需為重新整理後的摘要，將所有面向融合成一段流暢文字，而非逐項列舉
- 在分析文字結束後，必須另起一行輸出 [SCORE:X]，X 為 -100 到 +100 的整數，代表你的綜合判斷（+100 極度看漲，-100 極度看跌，0 中性）。例如：[SCORE:35] 或 [SCORE:-20]
- 你的 SCORE 非常重要：當訊號之間互相矛盾時，系統會提高你的 SCORE 權重（最高 55%），因此你的判斷對最終結果有決定性影響。請務必深思熟慮後才給出分數。
- 極度重要：即使新聞標題為英文，你的整段分析輸出也必須全部使用繁體中文。絕對不要輸出任何英文句子。`

const ANALYSIS_USER_TEMPLATE = `以下是 {stock_name}({stock_code}) 在 {timestamp} 的綜合分析數據：

目前股價：{current_price}（漲跌幅 {change_pct}）

【九大技術訊號】
1. 外盤比率：{outer_ratio_score}分 → {outer_ratio_desc}
2. 五檔壓力：{bid_ask_score}分 → {bid_ask_desc}
3. 10筆成交：{tick_dir_score}分 → {tick_dir_desc}
4. 日內位置：{intraday_score}分 → {intraday_desc}
5. 漲跌動能：{momentum_score}分 → {momentum_desc}
6. RSI(14)：{rsi_score}分 → {rsi_desc}
7. MACD OSC：{macd_score}分 → {macd_desc}
8. KD交叉：{kd_score}分 → {kd_desc}
9. 走勢加速度：{accel_score}分 → {accel_desc}

【籌碼面與市場環境】
10. 籌碼面：{institutional_score}分 → {institutional_desc}
11. 量價結構：{volume_price_score}分 → {volume_price_desc}
12. 大盤連動：{market_corr_score}分 → {market_corr_desc}
13. 均線系統：{ma_system_score}分 → {ma_system_desc}
14. 波動率：{volatility_score}分 → {volatility_desc}
15. 時間因子：{time_factor_score}分 → {time_factor_desc}

加權總分：{weighted_total_score}（{direction}）
信心值：{confidence}%
訊號一致性：{signal_agreement}

【基本面快照】
{fundamentals_block}

【近期相關新聞】
{news_block}

【市場狀態】：{market_status}
【預測區間】：未來 {horizon_label}

請綜合以上全部 15 個訊號（技術面、籌碼面、大盤環境）及基本面與新聞，用繁體中文輸出一段完整的摘要分析（約 150~200 字），判斷該股在**未來 {horizon_label}**的走勢方向（看漲／看跌／中性），並說明核心依據。請將各面向融合成連貫文字，不要逐項條列或只取片段。分析應反映當前市場狀態（{market_status}），若為休市或盤後則以前瞻預測角度撰寫。`

const SIGNAL_NAME_MAP: Record<string, { scoreKey: string; descKey: string }> = {
  '外盤比率': { scoreKey: 'outer_ratio_score', descKey: 'outer_ratio_desc' },
  '五檔委買委賣壓力': { scoreKey: 'bid_ask_score', descKey: 'bid_ask_desc' },
  '最近10筆成交方向': { scoreKey: 'tick_dir_score', descKey: 'tick_dir_desc' },
  '日內高低位置': { scoreKey: 'intraday_score', descKey: 'intraday_desc' },
  '即時漲跌幅動能': { scoreKey: 'momentum_score', descKey: 'momentum_desc' },
  'RSI': { scoreKey: 'rsi_score', descKey: 'rsi_desc' },
  'MACD OSC': { scoreKey: 'macd_score', descKey: 'macd_desc' },
  'KD交叉': { scoreKey: 'kd_score', descKey: 'kd_desc' },
  '盤中走勢加速度': { scoreKey: 'accel_score', descKey: 'accel_desc' },
  '籌碼面': { scoreKey: 'institutional_score', descKey: 'institutional_desc' },
  '量價結構': { scoreKey: 'volume_price_score', descKey: 'volume_price_desc' },
  '大盤連動': { scoreKey: 'market_corr_score', descKey: 'market_corr_desc' },
  '均線系統': { scoreKey: 'ma_system_score', descKey: 'ma_system_desc' },
  '波動率': { scoreKey: 'volatility_score', descKey: 'volatility_desc' },
  '時間因子': { scoreKey: 'time_factor_score', descKey: 'time_factor_desc' },
}

export function detectMarketStatus(): string {
  const now = new Date()
  const weekday = now.getDay() // 0=Sun, 6=Sat
  const hour = now.getHours()
  const minute = now.getMinutes()
  const timeMinutes = hour * 60 + minute

  if (weekday === 0 || weekday === 6) {
    return '週末休市（資料為上週五收盤，下個交易日為週一）'
  }

  if (timeMinutes < 9 * 60) {
    return '盤前（尚未開盤，資料為前一交易日收盤）'
  } else if (timeMinutes <= 13 * 60 + 30) {
    return '盤中交易時段'
  } else {
    if (weekday === 5) {
      return '盤後（週五收盤，下個交易日為週一）'
    }
    return '盤後（已收盤，資料為今日收盤）'
  }
}

export function formatFundamentals(fundamentals?: Partial<Fundamentals> | null): string {
  if (!fundamentals) return '（無基本面資料）'

  const lines: string[] = []
  const f = fundamentals

  if (f.pe) {
    let peStr = `本益比(PE)：${f.pe}`
    if (f.forward_pe) peStr += `（預估 PE ${f.forward_pe}）`
    lines.push(peStr)
  }
  if (f.pb) lines.push(`股價淨值比(PB)：${f.pb}`)
  if (f.eps) lines.push(`EPS(TTM)：${f.eps}`)
  if (f.dividend_yield) lines.push(`殖利率：${f.dividend_yield}%`)
  if (f.has_dividend != null) {
    if (f.has_dividend) {
      let divLine = '配息：有'
      if (f.last_dividend_amount && f.last_dividend_date) {
        divLine += `（上次 ${f.last_dividend_date} 配 ${f.last_dividend_amount} 元）`
      }
      if (f.dividend_months && f.dividend_months.length > 0) {
        divLine += `，月份：${f.dividend_months.map((m) => `${m}月`).join('、')}`
      }
      lines.push(divLine)
    } else {
      lines.push('配息：無')
    }
  }
  if (f.week_52_high && f.week_52_low) {
    lines.push(`52週區間：${f.week_52_low} ~ ${f.week_52_high}`)
  }
  if (f.beta) lines.push(`Beta：${f.beta}`)
  if (f.sector) {
    const industry = f.industry || ''
    lines.push(`產業：${f.sector}${industry ? ` / ${industry}` : ''}`)
  }

  return lines.length > 0 ? lines.join('\n') : '（無基本面資料）'
}

export function formatNews(news?: NewsItem[] | null): string {
  if (!news || news.length === 0) return '（暫無相關新聞）'

  const lines = news
    .slice(0, 5)
    .map((item, i) => {
      const tags: string[] = []
      if (item.source) tags.push(item.source)
      if (item.published) tags.push(item.published)
      const prefix = tags.length > 0 ? `[${tags.join(' · ')}] ` : ''
      return `${i + 1}. ${prefix}${item.title}`
    })
    .join('\n')

  return `${lines}\n（注意：以上新聞可能為英文來源，請用繁體中文摘要分析其影響）`
}

function formatTimestamp(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

export function buildAnalysisPrompt({
  stockCode,
  stockName,
  currentPrice,
  changePct,
  signals,
  weightedTotalScore,
  direction,
  confidence,
  signalAgreement,
  horizonLabel = '1週',
  news,
  fundamentals,
}: {
  stockCode: string
  stockName: string
  currentPrice: number
  changePct: number
  signals: SignalScore[]
  weightedTotalScore: number
  direction: string
  confidence: number
  signalAgreement: string
  horizonLabel?: string
  news?: NewsItem[] | null
  fundamentals?: Partial<Fundamentals> | null
}): string {
  const signalMap = new Map(signals.map((s) => [s.name, s]))

  function getVal(name: string, key: 'score' | 'description'): string {
    const s = signalMap.get(name)
    if (!s) return 'N/A'
    return String(s[key] ?? 'N/A')
  }

  const replacements: Record<string, string> = {
    stock_code: stockCode,
    stock_name: stockName,
    timestamp: formatTimestamp(),
    current_price: currentPrice.toFixed(2),
    change_pct: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
    weighted_total_score: weightedTotalScore.toFixed(1),
    direction,
    confidence: confidence.toFixed(1),
    signal_agreement: signalAgreement,
    horizon_label: horizonLabel,
    fundamentals_block: formatFundamentals(fundamentals),
    news_block: formatNews(news),
    market_status: detectMarketStatus(),
  }

  // Fill signal scores and descriptions
  for (const [signalName, mapping] of Object.entries(SIGNAL_NAME_MAP)) {
    replacements[mapping.scoreKey] = getVal(signalName, 'score')
    replacements[mapping.descKey] = getVal(signalName, 'description')
  }

  let result = ANALYSIS_USER_TEMPLATE
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replaceAll(`{${key}}`, value)
  }

  // Prepend system prompt (same as backend: Gemma models need it in content)
  return `${SYSTEM_PROMPT}\n\n---\n\n${result}`
}
