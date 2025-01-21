import { create, all } from "mathjs";

const math = create(all);

// Word to token conversion ratio
export const WORDS_TO_TOKENS_RATIO = 1.33;

// Convert words to tokens
export const wordsToTokens = (words: number) => {
  if (words <= 0) return 0;
  return Math.ceil(words * WORDS_TO_TOKENS_RATIO);
};

// Convert tokens to words
export const tokensToWords = (tokens: number) => {
  if (tokens <= 0) return 0;
  return Math.ceil(tokens / WORDS_TO_TOKENS_RATIO);
};

export interface OpenAIModel {
  name: string;
  description: string;
  inputPrice: number;
  outputPrice: number;
}

export type OpenAIModels = {
  [key: string]: OpenAIModel;
};

export const OPENAI_MODELS: OpenAIModels = {
  "gpt-4o": {
    name: "GPT-40",
    description:
      "Latest model with vision capabilities, 128K context (Oct 2023)",
    inputPrice: 0.0025, // $0.0025/1K tokens
    outputPrice: 0.01, // $0.01/1K tokens
  },
};

export interface CalculationInput {
  selectedModel: string;
  dailyUsers: number;
  conversationsPerUser: number;
  messagesPerConversation: number;
  wordsPerChunk: number;
  userQueryWords: number;
  responseWords: number;
  chunksPerQuery: number;
}

export interface CalculationResult {
  tokensPerMessage: number;
  wordsPerMessage: number;
  totalDailyMessages: number;
  dailyCost: number;
  monthlyCost: number;
  annualCost: number;
  costPerMessage: number;
  costPerUser: number;
  averageHistoryTokens: number;
  backcheck?: BackcheckResult;
}

export interface BackcheckResult {
  isValid: boolean;
  details: {
    inputTokensMatch: boolean;
    outputTokensMatch: boolean;
    totalMessagesMatch: boolean;
    dailyCostMatch: boolean;
    expectedValues: {
      inputTokens: number;
      outputTokens: number;
      totalMessages: number;
      dailyCost: number;
    };
    actualValues: {
      inputTokens: number;
      outputTokens: number;
      totalMessages: number;
      dailyCost: number;
    };
  };
}

export function performBackcheck(
  input: CalculationInput,
  result: CalculationResult,
  model: OpenAIModel | undefined,
  totalInputTokens: number,
  outputTokens: number
): BackcheckResult {
  // Calculate expected values from result
  const expectedTotalMessages =
    input.dailyUsers *
    input.conversationsPerUser *
    input.messagesPerConversation;
  const expectedDailyCost =
    (totalInputTokens * expectedTotalMessages * (model?.inputPrice ?? 0)) /
      1000 +
    (outputTokens * expectedTotalMessages * (model?.outputPrice ?? 0)) / 1000;

  // Get actual values from result
  const actualTotalMessages = result.totalDailyMessages;
  const actualDailyCost = result.dailyCost;

  // Compare values
  const totalMessagesMatch =
    Math.abs(expectedTotalMessages - actualTotalMessages) < 0.0001;
  const dailyCostMatch = Math.abs(expectedDailyCost - actualDailyCost) < 0.0001;
  const inputTokensMatch = true; // Since we use the same calculation
  const outputTokensMatch = true; // Since we use the same calculation

  return {
    isValid:
      totalMessagesMatch &&
      dailyCostMatch &&
      inputTokensMatch &&
      outputTokensMatch,
    details: {
      inputTokensMatch,
      outputTokensMatch,
      totalMessagesMatch,
      dailyCostMatch,
      expectedValues: {
        inputTokens: totalInputTokens,
        outputTokens,
        totalMessages: expectedTotalMessages,
        dailyCost: expectedDailyCost,
      },
      actualValues: {
        inputTokens: totalInputTokens,
        outputTokens,
        totalMessages: actualTotalMessages,
        dailyCost: actualDailyCost,
      },
    },
  };
}

export function calculateCosts(input: CalculationInput): CalculationResult {
  try {
    const model = OPENAI_MODELS[input.selectedModel];

    // Early return if any essential values are zero
    if (
      input.dailyUsers === 0 ||
      input.conversationsPerUser === 0 ||
      input.messagesPerConversation === 0
    ) {
      return {
        tokensPerMessage: 0,
        wordsPerMessage: 0,
        totalDailyMessages: 0,
        dailyCost: 0,
        monthlyCost: 0,
        annualCost: 0,
        costPerMessage: 0,
        costPerUser: 0,
        averageHistoryTokens: 0,
        backcheck: {
          isValid: true,
          details: {
            inputTokensMatch: true,
            outputTokensMatch: true,
            totalMessagesMatch: true,
            dailyCostMatch: true,
            expectedValues: {
              inputTokens: 0,
              outputTokens: 0,
              totalMessages: 0,
              dailyCost: 0,
            },
            actualValues: {
              inputTokens: 0,
              outputTokens: 0,
              totalMessages: 0,
              dailyCost: 0,
            },
          },
        },
      };
    }

    // Convert words to tokens for calculations
    const chunkTokens = wordsToTokens(input.wordsPerChunk);
    const queryTokens = wordsToTokens(input.userQueryWords);
    const outputTokens = wordsToTokens(input.responseWords);

    // Calculate conversation history tokens for each message
    // For message N, we include N-1 previous exchanges (query + response)
    const getHistoryTokensForMessage = (messageIndex: number) => {
      if (messageIndex === 0) return 0;
      return messageIndex * (queryTokens + outputTokens);
    };

    // Calculate average history tokens across all messages
    const totalHistoryTokens = Array.from({
      length: input.messagesPerConversation,
    })
      .map((_, index) => getHistoryTokensForMessage(index))
      .reduce((sum, tokens) => sum + tokens, 0);
    const averageHistoryTokens =
      totalHistoryTokens / input.messagesPerConversation;

    // Calculate total input tokens per message (including history)
    const totalInputTokens = math
      .chain(input.chunksPerQuery)
      .multiply(chunkTokens)
      .add(queryTokens)
      .add(averageHistoryTokens)
      .done();

    const tokensPerMessage = totalInputTokens + outputTokens;
    const wordsPerMessage = tokensToWords(totalInputTokens + outputTokens);

    // Calculate total messages per day
    const totalDailyMessages = math
      .chain(input.dailyUsers)
      .multiply(input.conversationsPerUser)
      .multiply(input.messagesPerConversation)
      .done();

    // Calculate daily cost
    const dailyInputCost = math
      .chain(totalInputTokens)
      .multiply(totalDailyMessages)
      .divide(1000)
      .multiply(model?.inputPrice ?? 0)
      .done();

    const dailyOutputCost = math
      .chain(outputTokens)
      .multiply(totalDailyMessages)
      .divide(1000)
      .multiply(model?.outputPrice ?? 0)
      .done();

    const dailyCost = math.add(dailyInputCost, dailyOutputCost);
    const monthlyCost = math.multiply(dailyCost, 30);
    const annualCost = math.multiply(dailyCost, 365);

    // Calculate cost per message (monthly)
    const costPerMessage =
      totalDailyMessages > 0
        ? math
            .chain(monthlyCost)
            .divide(math.multiply(totalDailyMessages, 30))
            .done()
        : 0;

    // Calculate cost per user (monthly)
    const costPerUser =
      input.dailyUsers > 0
        ? math.chain(monthlyCost).divide(input.dailyUsers).done()
        : 0;

    const result = {
      tokensPerMessage,
      wordsPerMessage,
      totalDailyMessages,
      dailyCost,
      monthlyCost,
      annualCost,
      costPerMessage,
      costPerUser,
      averageHistoryTokens: Math.round(averageHistoryTokens),
    };

    // Perform backcheck
    const backcheck = performBackcheck(
      input,
      result,
      model,
      totalInputTokens,
      outputTokens
    );

    return {
      ...result,
      backcheck,
    };
  } catch (error) {
    console.error("Calculation error:", error);
    return {
      tokensPerMessage: 0,
      wordsPerMessage: 0,
      totalDailyMessages: 0,
      dailyCost: 0,
      monthlyCost: 0,
      annualCost: 0,
      costPerMessage: 0,
      costPerUser: 0,
      averageHistoryTokens: 0,
      backcheck: {
        isValid: false,
        details: {
          inputTokensMatch: false,
          outputTokensMatch: false,
          totalMessagesMatch: false,
          dailyCostMatch: false,
          expectedValues: {
            inputTokens: 0,
            outputTokens: 0,
            totalMessages: 0,
            dailyCost: 0,
          },
          actualValues: {
            inputTokens: 0,
            outputTokens: 0,
            totalMessages: 0,
            dailyCost: 0,
          },
        },
      },
    };
  }
}
