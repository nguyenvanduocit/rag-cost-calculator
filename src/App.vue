<script setup lang="ts">
import { ref, computed } from 'vue'
import { create, all } from 'mathjs'

const math = create(all)

// Helper functions for generating example content
const generateRandomText = (wordCount: number): string => {
  const loremWords = [
    'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
    'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
    'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation'
  ]
  
  const result = []
  for (let i = 0; i < wordCount; i++) {
    result.push(loremWords[Math.floor(Math.random() * loremWords.length)])
  }
  return result.join(' ')
}

// Example content computed property
const exampleContent = computed(() => {
  const conversation = []
  for (let i = 0; i < messagesPerConversation.value; i++) {
    conversation.push({
      userQuery: generateRandomText(userQueryWords.value),
      chunks: Array.from({ length: chunksPerQuery.value }, () => generateRandomText(wordsPerChunk.value)),
      response: generateRandomText(responseWords.value)
    })
  }
  return {
    conversation
  }
})

// Add randomization functions
const randomizeSettings = () => {
  // Randomize within reasonable bounds
  dailyUsers.value = Math.floor(Math.random() * 900) + 100 // 100-1000
  conversationsPerUser.value = Math.floor(Math.random() * 5) + 1 // 1-5
  messagesPerConversation.value = Math.floor(Math.random() * 7) + 3 // 3-10
  wordsPerChunk.value = Math.floor(Math.random() * 300) + 100 // 100-400
  userQueryWords.value = Math.floor(Math.random() * 32) + 8 // 8-40
  responseWords.value = Math.floor(Math.random() * 90) + 30 // 30-120
  chunksPerQuery.value = Math.floor(Math.random() * 3) + 1 // 1-3
}

// Word to token conversion ratio
const WORDS_TO_TOKENS_RATIO = 1.33 // 1 word ≈ 1.33 tokens

// Convert words to tokens
const wordsToTokens = (words: number) => Math.ceil(words * WORDS_TO_TOKENS_RATIO)

// Convert tokens to words
const tokensToWords = (tokens: number) => Math.ceil(tokens / WORDS_TO_TOKENS_RATIO)

interface OpenAIModel {
  name: string
  description: string
  inputPrice: number
  outputPrice: number
}

type OpenAIModels = {
  [key: string]: OpenAIModel
}

const OPENAI_MODELS: OpenAIModels = {
  'gpt-4o': {
    name: 'GPT-40',
    description: 'Latest model with vision capabilities, 128K context (Oct 2023)',
    inputPrice: 0.0025,      // $0.0025/1K tokens
    outputPrice: 0.01        // $0.01/1K tokens
  }
}

// Model selection
const selectedModel = ref<string>('gpt-4o')

// Basic settings
const dailyUsers = ref<number>(100)
const conversationsPerUser = ref<number>(3)
const messagesPerConversation = ref<number>(5)

// Word settings
const wordsPerChunk = ref<number>(200) // ~500 tokens
const userQueryWords = ref<number>(18) // ~40 tokens
const responseWords = ref<number>(60) // ~100 tokens
const chunksPerQuery = ref<number>(2)

// Computed values
const calculations = computed(() => {
  try {
    const model = OPENAI_MODELS[selectedModel.value]
    
    // Convert words to tokens for calculations
    const chunkTokens = wordsToTokens(wordsPerChunk.value)
    const queryTokens = wordsToTokens(userQueryWords.value)
    const outputTokens = wordsToTokens(responseWords.value)
    
    // Calculate total input tokens per message
    const totalInputTokens = math.chain(chunksPerQuery.value)
      .multiply(chunkTokens)
      .add(queryTokens)
      .done()
    
    const tokensPerMessage = totalInputTokens + outputTokens
    const wordsPerMessage = tokensToWords(totalInputTokens + outputTokens)

    // Calculate total messages per day
    const totalDailyMessages = math.chain(dailyUsers.value)
      .multiply(conversationsPerUser.value)
      .multiply(messagesPerConversation.value)
      .done()

    // Calculate daily cost
    const dailyInputCost = math.chain(totalInputTokens)
      .multiply(totalDailyMessages)
      .divide(1000)
      .multiply(model.inputPrice)
      .done()
      
    const dailyOutputCost = math.chain(outputTokens)
      .multiply(totalDailyMessages)
      .divide(1000)
      .multiply(model.outputPrice)
      .done()
      
    const dailyCost = math.add(dailyInputCost, dailyOutputCost)
    const monthlyCost = math.multiply(dailyCost, 30)
    const annualCost = math.multiply(dailyCost, 365)

    return {
      tokensPerMessage,
      wordsPerMessage,
      totalDailyMessages,
      dailyCost,
      monthlyCost,
      annualCost
    }
  } catch (error) {
    console.error('Calculation error:', error)
    return {
      tokensPerMessage: 0,
      wordsPerMessage: 0,
      totalDailyMessages: 0,
      dailyCost: 0,
      monthlyCost: 0,
      annualCost: 0
    }
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="container mx-auto px-4 max-w-6xl">
      <div class="bg-white rounded-xl shadow-xl p-8">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-3">OpenAI RAG Cost Calculator</h1>
          <p class="text-gray-600 text-lg">Calculate costs based on word count (automatically converted to tokens)</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <!-- Model Selection -->
          <div class="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <label class="block text-gray-700 font-semibold mb-3">OpenAI Model</label>
            <select v-model="selectedModel" class="w-full border border-gray-300 rounded-lg p-3 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option v-for="(model, id) in OPENAI_MODELS" :key="id" :value="id">
                {{ model.name }}
              </option>
            </select>
            <p class="mt-2 text-sm text-gray-600">{{ OPENAI_MODELS[selectedModel].description }}</p>
          </div>

          <!-- Usage Settings -->
          <div class="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-5">
            <div>
              <label class="block text-gray-700 font-semibold mb-2">Daily Active Users</label>
              <input
                type="number"
                v-model.number="dailyUsers"
                min="1"
                class="w-full border border-gray-300 rounded-lg p-3 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
            </div>
            
            <div>
              <label class="block text-gray-700 font-semibold mb-2">Conversations per User per Day</label>
              <input
                type="number"
                v-model.number="conversationsPerUser"
                min="1"
                class="w-full border border-gray-300 rounded-lg p-3 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
            </div>

            <div>
              <label class="block text-gray-700 font-semibold mb-2">Messages per Conversation</label>
              <input
                type="number"
                v-model.number="messagesPerConversation"
                min="1"
                class="w-full border border-gray-300 rounded-lg p-3 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
            </div>
          </div>

          <!-- Word Settings -->
          <div class="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-5">
            <div>
              <label class="block text-gray-700 font-semibold mb-2">
                Words per Chunk <span class="text-gray-500 font-normal">(≈{{ wordsToTokens(wordsPerChunk) }} tokens)</span>
              </label>
              <input
                type="number"
                v-model.number="wordsPerChunk"
                min="1"
                class="w-full border border-gray-300 rounded-lg p-3 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
            </div>

            <div>
              <label class="block text-gray-700 font-semibold mb-2">Chunks per Query</label>
              <input
                type="number"
                v-model.number="chunksPerQuery"
                min="1"
                class="w-full border border-gray-300 rounded-lg p-3 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
            </div>
          </div>

          <div class="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-5">
            <div>
              <label class="block text-gray-700 font-semibold mb-2">
                User Query Words <span class="text-gray-500 font-normal">(≈{{ wordsToTokens(userQueryWords) }} tokens)</span>
              </label>
              <input
                type="number"
                v-model.number="userQueryWords"
                min="1"
                class="w-full border border-gray-300 rounded-lg p-3 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
            </div>

            <div>
              <label class="block text-gray-700 font-semibold mb-2">
                Response Words <span class="text-gray-500 font-normal">(≈{{ wordsToTokens(responseWords) }} tokens)</span>
              </label>
              <input
                type="number"
                v-model.number="responseWords"
                min="1"
                class="w-full border border-gray-300 rounded-lg p-3 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
            </div>
          </div>
        </div>

        <!-- Results -->
        <div class="space-y-6">
          <div class="bg-blue-50 p-6 rounded-xl border border-blue-100">
            <h3 class="text-xl font-bold text-blue-900 mb-4">Model Pricing: {{ OPENAI_MODELS[selectedModel].name }}</h3>
            <div class="grid grid-cols-2 gap-6">
              <div class="bg-white p-4 rounded-lg shadow-sm">
                <p class="text-sm font-medium text-blue-800 mb-1">Input Cost</p>
                <p class="text-2xl font-semibold">${{ OPENAI_MODELS[selectedModel].inputPrice }} <span class="text-sm text-gray-600">per 1K tokens</span></p>
              </div>
              <div class="bg-white p-4 rounded-lg shadow-sm">
                <p class="text-sm font-medium text-blue-800 mb-1">Output Cost</p>
                <p class="text-2xl font-semibold">${{ OPENAI_MODELS[selectedModel].outputPrice }} <span class="text-sm text-gray-600">per 1K tokens</span></p>
              </div>
            </div>
          </div>

          <div class="bg-green-50 p-6 rounded-xl border border-green-100">
            <h3 class="text-xl font-bold text-green-900 mb-4">Usage & Cost Breakdown</h3>
            <div class="grid grid-cols-2 gap-6">
              <div class="bg-white p-4 rounded-lg shadow-sm">
                <p class="text-sm font-medium text-green-800 mb-1">Words per Message</p>
                <p class="text-2xl font-semibold">{{ Math.round(calculations.wordsPerMessage) }} <span class="text-sm text-gray-600">words</span></p>
              </div>
              <div class="bg-white p-4 rounded-lg shadow-sm">
                <p class="text-sm font-medium text-green-800 mb-1">Tokens per Message</p>
                <p class="text-2xl font-semibold">{{ Math.round(calculations.tokensPerMessage) }} <span class="text-sm text-gray-600">tokens</span></p>
              </div>
              <div class="bg-white p-4 rounded-lg shadow-sm">
                <p class="text-sm font-medium text-green-800 mb-1">Total Daily Messages</p>
                <p class="text-2xl font-semibold">{{ calculations.totalDailyMessages }}</p>
              </div>
              <div class="bg-white p-4 rounded-lg shadow-sm">
                <p class="text-sm font-medium text-green-800 mb-1">Daily Cost</p>
                <p class="text-2xl font-semibold">${{ calculations.dailyCost.toFixed(4) }}</p>
              </div>
              <div class="bg-white p-4 rounded-lg shadow-sm">
                <p class="text-sm font-medium text-green-800 mb-1">Monthly Cost (30 days)</p>
                <p class="text-2xl font-semibold">${{ calculations.monthlyCost.toFixed(2) }}</p>
              </div>
              <div class="col-span-2 bg-white p-4 rounded-lg shadow-sm">
                <p class="text-sm font-medium text-green-800 mb-1">Projected Annual Cost</p>
                <p class="text-2xl font-semibold">${{ calculations.annualCost.toFixed(2) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div class="mt-8 bg-gray-50 p-6 rounded-xl border border-gray-200">
          <p class="font-semibold text-gray-900 mb-3">Notes:</p>
          <ul class="space-y-2 text-gray-700">
            <li class="flex items-start">
              <span class="text-gray-400 mr-2">•</span>
              Word counts are automatically converted to tokens (1 word ≈ 1.33 tokens)
            </li>
            <li class="flex items-start">
              <span class="text-gray-400 mr-2">•</span>
              Total daily messages = Users × Conversations per user × Messages per conversation
            </li>
            <li class="flex items-start">
              <span class="text-gray-400 mr-2">•</span>
              Input tokens per message = (Chunks × Words per Chunk × 1.33) + (Query Words × 1.33)
            </li>
            <li class="flex items-start">
              <span class="text-gray-400 mr-2">•</span>
              Output tokens per message = Response Words × 1.33
            </li>
            <li class="flex items-start">
              <span class="text-gray-400 mr-2">•</span>
              Monthly costs assume 30 days, annual costs use 365 days
            </li>
          </ul>
        </div>

        <!-- Example Content -->
        <div class="mt-8 bg-purple-50 p-6 rounded-xl border border-purple-100">
          <h3 class="text-xl font-bold text-purple-900 mb-4">Example Conversation Flow</h3>
          
          <div class="space-y-6">
            <div v-for="(exchange, index) in exampleContent.conversation" :key="index" class="space-y-6">
              <!-- User Query -->
              <div class="flex justify-end">
                <div class="bg-blue-500 text-white p-4 rounded-2xl rounded-tr-none max-w-[80%] shadow-sm">
                  <p class="text-sm font-medium text-blue-100 mb-1">Message {{ index + 1 }} - User Query ({{ userQueryWords }} words)</p>
                  <p>{{ exchange.userQuery }}</p>
                </div>
              </div>

              <!-- Retrieved Chunks -->
              <div class="flex flex-col space-y-2">
                <p class="text-sm font-medium text-purple-800 px-4">Retrieved Context ({{ chunksPerQuery }} × {{ wordsPerChunk }} words)</p>
                <div v-for="(chunk, chunkIndex) in exchange.chunks" :key="chunkIndex" 
                     class="bg-gray-100 p-4 rounded-2xl max-w-[80%] shadow-sm">
                  <p class="text-gray-700">{{ chunk }}</p>
                </div>
              </div>

              <!-- AI Response -->
              <div class="flex justify-start">
                <div class="bg-white p-4 rounded-2xl rounded-tl-none max-w-[80%] shadow-sm border border-gray-200">
                  <p class="text-sm font-medium text-purple-800 mb-1">Message {{ index + 1 }} - AI Response ({{ responseWords }} words)</p>
                  <p class="text-gray-700">{{ exchange.response }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.container {
  max-width: 1200px;
}

input[type="number"] {
  -moz-appearance: textfield;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
