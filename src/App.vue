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
  const chunks = []
  for (let i = 0; i < chunksPerQuery.value; i++) {
    chunks.push(generateRandomText(wordsPerChunk.value))
  }
  
  return {
    userQuery: generateRandomText(userQueryWords.value),
    chunks: chunks,
    response: generateRandomText(responseWords.value)
  }
})

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
    name: 'GPT-4O',
    description: 'Latest model with vision capabilities, 128K context (Oct 2023)',
    inputPrice: 0.0025,      // $0.0025/1K tokens
    outputPrice: 0.01        // $0.01/1K tokens
  },
  'gpt-4o-2024-11-20': {
    name: 'GPT-4O (Nov 2023)', 
    description: 'November 2023 snapshot',
    inputPrice: 0.0025,
    outputPrice: 0.01
  },
  'gpt-4o-2024-08-06': {
    name: 'GPT-4O (Aug 2023)',
    description: 'August 2023 snapshot', 
    inputPrice: 0.0025,
    outputPrice: 0.01
  }
}

// Model selection
const selectedModel = ref<string>('gpt-4o')

// Basic settings
const dailyUsers = ref<number>(100)
const messagesPerUser = ref<number>(10)

// Word settings
const wordsPerChunk = ref<number>(375) // ~500 tokens
const userQueryWords = ref<number>(30) // ~40 tokens
const responseWords = ref<number>(75) // ~100 tokens
const chunksPerQuery = ref<number>(3)

// Computed values
const calculations = computed(() => {
  try {
    const model = OPENAI_MODELS[selectedModel.value]
    
    // Convert words to tokens for calculations
    const chunkTokens = wordsToTokens(wordsPerChunk.value)
    const queryTokens = wordsToTokens(userQueryWords.value)
    const outputTokens = wordsToTokens(responseWords.value)
    
    // Calculate total input tokens
    const totalInputTokens = math.chain(chunksPerQuery.value)
      .multiply(chunkTokens)
      .add(queryTokens)
      .done()
    
    const tokensPerQuery = totalInputTokens + outputTokens
    const wordsPerQuery = tokensToWords(totalInputTokens + outputTokens)

    // Calculate daily cost
    const dailyInputCost = math.chain(totalInputTokens)
      .multiply(messagesPerUser.value)
      .multiply(dailyUsers.value)
      .divide(1000)
      .multiply(model.inputPrice)
      .done()
      
    const dailyOutputCost = math.chain(outputTokens)
      .multiply(messagesPerUser.value)
      .multiply(dailyUsers.value)
      .divide(1000)
      .multiply(model.outputPrice)
      .done()
      
    const dailyCost = math.add(dailyInputCost, dailyOutputCost)
    const monthlyCost = math.multiply(dailyCost, 30)
    const annualCost = math.multiply(dailyCost, 365)

    return {
      tokensPerQuery,
      wordsPerQuery,
      dailyCost,
      monthlyCost,
      annualCost
    }
  } catch (error) {
    console.error('Calculation error:', error)
    return {
      tokensPerQuery: 0,
      wordsPerQuery: 0,
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
              <label class="block text-gray-700 font-semibold mb-2">Messages per User per Day</label>
              <input
                type="number"
                v-model.number="messagesPerUser"
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
                <p class="text-sm font-medium text-green-800 mb-1">Words per Query</p>
                <p class="text-2xl font-semibold">{{ Math.round(calculations.wordsPerQuery) }} <span class="text-sm text-gray-600">words</span></p>
              </div>
              <div class="bg-white p-4 rounded-lg shadow-sm">
                <p class="text-sm font-medium text-green-800 mb-1">Tokens per Query</p>
                <p class="text-2xl font-semibold">{{ Math.round(calculations.tokensPerQuery) }} <span class="text-sm text-gray-600">tokens</span></p>
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
              Input tokens = (Chunks × Words per Chunk × 1.33) + (Query Words × 1.33)
            </li>
            <li class="flex items-start">
              <span class="text-gray-400 mr-2">•</span>
              Output tokens = Response Words × 1.33
            </li>
            <li class="flex items-start">
              <span class="text-gray-400 mr-2">•</span>
              Monthly costs assume 30 days, annual costs use 365 days
            </li>
          </ul>
        </div>

        <!-- Example Content -->
        <div class="mt-8 bg-purple-50 p-6 rounded-xl border border-purple-100">
          <h3 class="text-xl font-bold text-purple-900 mb-4">Example Message Flow</h3>
          
          <div class="space-y-6">
            <div class="bg-white p-4 rounded-lg shadow-sm">
              <p class="text-sm font-medium text-purple-800 mb-2">User Query ({{ userQueryWords }} words)</p>
              <p class="text-gray-700">{{ exampleContent.userQuery }}</p>
            </div>

            <div class="bg-white p-4 rounded-lg shadow-sm">
              <p class="text-sm font-medium text-purple-800 mb-2">Retrieved Chunks ({{ chunksPerQuery }} × {{ wordsPerChunk }} words)</p>
              <div class="space-y-3">
                <div v-for="(chunk, index) in exampleContent.chunks" :key="index" class="p-3 bg-purple-50 rounded">
                  <p class="text-gray-700">{{ chunk }}</p>
                </div>
              </div>
            </div>

            <div class="bg-white p-4 rounded-lg shadow-sm">
              <p class="text-sm font-medium text-purple-800 mb-2">AI Response ({{ responseWords }} words)</p>
              <p class="text-gray-700">{{ exampleContent.response }}</p>
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
