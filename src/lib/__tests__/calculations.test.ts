import { describe, it, expect } from 'vitest'
import { create, all } from 'mathjs'

const math = create(all)

// Word to token conversion ratio
const WORDS_TO_TOKENS_RATIO = 1.33

// Convert words to tokens
const wordsToTokens = (words: number) => Math.ceil(words * WORDS_TO_TOKENS_RATIO)

// Convert tokens to words
const tokensToWords = (tokens: number) => Math.ceil(tokens / WORDS_TO_TOKENS_RATIO)

describe('Word-Token Conversion', () => {
  it('should correctly convert words to tokens', () => {
    expect(wordsToTokens(10)).toBe(14) // 10 * 1.33 = 13.3, ceil to 14
    expect(wordsToTokens(100)).toBe(133)
    expect(wordsToTokens(0)).toBe(0)
    expect(wordsToTokens(-1)).toBe(0) // Negative input should return 0
    expect(wordsToTokens(0.5)).toBe(1) // Decimal input should be rounded up
    expect(wordsToTokens(1000000)).toBe(1330000) // Large number test
  })

  it('should correctly convert tokens to words', () => {
    expect(tokensToWords(14)).toBe(11) // 14 / 1.33 = 10.52, ceil to 11
    expect(tokensToWords(133)).toBe(100)
    expect(tokensToWords(0)).toBe(0)
    expect(tokensToWords(-1)).toBe(0) // Negative input should return 0
    expect(tokensToWords(0.5)).toBe(1) // Decimal input should be rounded up
    expect(tokensToWords(1000000)).toBe(751880) // Large number test
  })
})

describe('Cost Calculations', () => {
  const MODEL = {
    inputPrice: 0.0025,
    outputPrice: 0.01
  }

  it('should calculate correct history tokens', () => {
    const queryTokens = 40
    const outputTokens = 100
    const messageIndex = 2

    const historyTokens = messageIndex * (queryTokens + outputTokens)
    expect(historyTokens).toBe(280) // 2 * (40 + 100) = 280
  })

  it('should calculate correct total input tokens', () => {
    const chunksPerQuery = 2
    const chunkTokens = 500
    const queryTokens = 40
    const historyTokens = 280

    const totalInputTokens = math.chain(chunksPerQuery)
      .multiply(chunkTokens)
      .add(queryTokens)
      .add(historyTokens)
      .done()

    expect(totalInputTokens).toBe(1320) // (2 * 500) + 40 + 280 = 1320
  })

  it('should calculate correct daily costs', () => {
    const totalInputTokens = 1320
    const outputTokens = 100
    const totalDailyMessages = 1500 // example: 100 users * 3 conversations * 5 messages

    const dailyInputCost = math.chain(totalInputTokens)
      .multiply(totalDailyMessages)
      .divide(1000)
      .multiply(MODEL.inputPrice)
      .done()

    const dailyOutputCost = math.chain(outputTokens)
      .multiply(totalDailyMessages)
      .divide(1000)
      .multiply(MODEL.outputPrice)
      .done()

    const dailyCost = math.add(dailyInputCost, dailyOutputCost)
    
    // 1320 * 1500 / 1000 * 0.0025 = 4.95 (input cost)
    // 100 * 1500 / 1000 * 0.01 = 1.5 (output cost)
    // Total = 6.45
    expect(dailyCost).toBe(6.45)
  })

  it('should calculate correct monthly and annual costs', () => {
    const dailyCost = 6.45
    const monthlyCost = math.multiply(dailyCost, 30)
    const annualCost = math.multiply(dailyCost, 365)

    expect(monthlyCost).toBe(193.5) // 6.45 * 30
    expect(annualCost).toBe(2354.25) // 6.45 * 365
  })

  it('should handle edge cases for history tokens calculation', () => {
    expect(() => {
      const queryTokens = -40
      const outputTokens = 100
      const messageIndex = 2
      const historyTokens = messageIndex * (queryTokens + outputTokens)
      return historyTokens
    }).not.toThrow()

    expect(() => {
      const queryTokens = Number.MAX_SAFE_INTEGER
      const outputTokens = 100
      const messageIndex = 2
      const historyTokens = messageIndex * (queryTokens + outputTokens)
      return historyTokens
    }).not.toThrow()
  })

  it('should handle edge cases for cost calculations', () => {
    const totalInputTokens = 0
    const outputTokens = 0
    const totalDailyMessages = 0

    const dailyInputCost = math.chain(totalInputTokens)
      .multiply(totalDailyMessages)
      .divide(1000)
      .multiply(MODEL.inputPrice)
      .done()

    const dailyOutputCost = math.chain(outputTokens)
      .multiply(totalDailyMessages)
      .divide(1000)
      .multiply(MODEL.outputPrice)
      .done()

    const dailyCost = math.add(dailyInputCost, dailyOutputCost)
    
    expect(dailyCost).toBe(0) // Zero usage should result in zero cost

    // Test with very small numbers
    const smallDailyCost = math.chain(1)
      .multiply(1)
      .divide(1000)
      .multiply(MODEL.inputPrice)
      .done()
    
    expect(smallDailyCost).toBe(0.0000025) // Verify precision with small numbers
  })
}) 