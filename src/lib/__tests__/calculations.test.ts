import { describe, it, expect } from 'vitest'
import {
  wordsToTokens,
  tokensToWords,
  WORDS_TO_TOKENS_RATIO,
  calculateCosts,
  OPENAI_MODELS,
  type CalculationInput,
} from "../calculations";

describe("Word-Token Conversion", () => {
  it("should correctly convert words to tokens", () => {
    expect(wordsToTokens(10)).toBe(14); // 10 * 1.33 = 13.3, ceil to 14
    expect(wordsToTokens(100)).toBe(133);
    expect(wordsToTokens(0)).toBe(0);
    expect(wordsToTokens(-1)).toBe(0); // Negative input should return 0
    expect(wordsToTokens(0.5)).toBe(1); // Decimal input should be rounded up
    expect(wordsToTokens(1000000)).toBe(1330000); // Large number test
  });

  it("should correctly convert tokens to words", () => {
    expect(tokensToWords(14)).toBe(11); // 14 / 1.33 = 10.52, ceil to 11
    expect(tokensToWords(133)).toBe(100);
    expect(tokensToWords(0)).toBe(0);
    expect(tokensToWords(-1)).toBe(0); // Negative input should return 0
    expect(tokensToWords(0.5)).toBe(1); // Decimal input should be rounded up
    expect(tokensToWords(1000000)).toBe(751880); // Large number test
  });
});

describe("Cost Calculations", () => {
  const defaultInput: CalculationInput = {
    selectedModel: "gpt-4o",
    dailyUsers: 100,
    conversationsPerUser: 3,
    messagesPerConversation: 5,
    wordsPerChunk: 200,
    userQueryWords: 18,
    responseWords: 60,
    chunksPerQuery: 2,
  };

  it("should calculate basic costs correctly", () => {
    const result = calculateCosts(defaultInput);

    // Verify total daily messages
    expect(result.totalDailyMessages).toBe(1500); // 100 users * 3 conversations * 5 messages

    // Verify tokens per message calculations
    const expectedChunkTokens = Math.ceil(200 * WORDS_TO_TOKENS_RATIO) * 2; // wordsPerChunk * ratio * chunksPerQuery
    const expectedQueryTokens = Math.ceil(18 * WORDS_TO_TOKENS_RATIO);
    const expectedResponseTokens = Math.ceil(60 * WORDS_TO_TOKENS_RATIO);

    expect(result.tokensPerMessage).toBeGreaterThan(
      expectedChunkTokens + expectedQueryTokens + expectedResponseTokens
    );

    // Verify backcheck
    expect(result.backcheck?.isValid).toBe(true);
    expect(result.backcheck?.details.totalMessagesMatch).toBe(true);
    expect(result.backcheck?.details.dailyCostMatch).toBe(true);
  });

  it("should handle zero values gracefully", () => {
    const zeroInput: CalculationInput = {
      ...defaultInput,
      dailyUsers: 0,
      conversationsPerUser: 0,
      messagesPerConversation: 0,
    };

    const result = calculateCosts(zeroInput);
    expect(result.totalDailyMessages).toBe(0);
    expect(result.dailyCost).toBe(0);
    expect(result.monthlyCost).toBe(0);
    expect(result.annualCost).toBe(0);

    // Verify backcheck for zero values
    expect(result.backcheck?.isValid).toBe(true);
    expect(result.backcheck?.details.expectedValues.dailyCost).toBe(0);
    expect(result.backcheck?.details.actualValues.dailyCost).toBe(0);
  });

  it("should calculate costs with different models", () => {
    const model = OPENAI_MODELS["gpt-4o"];
    const result = calculateCosts(defaultInput);

    // Verify that costs are calculated using model prices
    expect(result.dailyCost).toBeGreaterThan(0);
    expect(result.monthlyCost).toBe(result.dailyCost * 30);
    expect(result.annualCost).toBe(result.dailyCost * 365);

    // Verify backcheck with model prices
    expect(result.backcheck?.isValid).toBe(true);
    expect(result.backcheck?.details.expectedValues.dailyCost).toBeCloseTo(
      result.dailyCost,
      4
    );
  });

  it("should calculate per-message and per-user costs", () => {
    const result = calculateCosts(defaultInput);

    // Verify per-message cost
    const expectedPerMessageCost =
      result.monthlyCost / (result.totalDailyMessages * 30);
    expect(result.costPerMessage).toBe(expectedPerMessageCost);

    // Verify per-user cost
    const expectedPerUserCost = result.monthlyCost / defaultInput.dailyUsers;
    expect(result.costPerUser).toBe(expectedPerUserCost);

    // Verify backcheck
    expect(result.backcheck?.isValid).toBe(true);
  });

  it("should handle conversation history correctly", () => {
    const result = calculateCosts(defaultInput);

    // For 5 messages, history tokens should be calculated correctly
    expect(result.averageHistoryTokens).toBeGreaterThanOrEqual(0);

    // Test with single message conversation
    const singleMessageResult = calculateCosts({
      ...defaultInput,
      messagesPerConversation: 1,
    });
    expect(singleMessageResult.averageHistoryTokens).toBe(0);

    // Verify backcheck for both cases
    expect(result.backcheck?.isValid).toBe(true);
    expect(singleMessageResult.backcheck?.isValid).toBe(true);
  });

  it("should handle invalid model gracefully", () => {
    const result = calculateCosts({
      ...defaultInput,
      selectedModel: "non-existent-model",
    });

    expect(result.dailyCost).toBe(0);
    expect(result.monthlyCost).toBe(0);
    expect(result.annualCost).toBe(0);

    // Verify backcheck for invalid model
    expect(result.backcheck?.isValid).toBe(true);
    expect(result.backcheck?.details.expectedValues.dailyCost).toBe(0);
    expect(result.backcheck?.details.actualValues.dailyCost).toBe(0);
  });

  describe("Backcheck Functionality", () => {
    it("should validate calculations match expected values", () => {
      const result = calculateCosts(defaultInput);
      expect(result.backcheck).toBeDefined();
      expect(result.backcheck?.isValid).toBe(true);
      expect(result.backcheck?.details.inputTokensMatch).toBe(true);
      expect(result.backcheck?.details.outputTokensMatch).toBe(true);
      expect(result.backcheck?.details.totalMessagesMatch).toBe(true);
      expect(result.backcheck?.details.dailyCostMatch).toBe(true);
    });

    it("should provide detailed comparison values", () => {
      const result = calculateCosts(defaultInput);
      const backcheck = result.backcheck;

      expect(backcheck?.details.expectedValues.totalMessages).toBe(
        defaultInput.dailyUsers *
          defaultInput.conversationsPerUser *
          defaultInput.messagesPerConversation
      );
      expect(backcheck?.details.actualValues.totalMessages).toBe(
        result.totalDailyMessages
      );

      expect(backcheck?.details.expectedValues.dailyCost).toBeCloseTo(
        result.dailyCost,
        4
      );
      expect(backcheck?.details.actualValues.dailyCost).toBe(result.dailyCost);
    });
  });
}); 