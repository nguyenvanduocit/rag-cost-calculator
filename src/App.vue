<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { generateConversation } from './lib/conversation'
import { createUrlStateManager } from './lib/urlState'
import { 
  calculateCosts, 
  wordsToTokens, 
  tokensToWords,
  OPENAI_MODELS,
  type OpenAIModel,
  type OpenAIModels
} from './lib/calculations'

const urlStateManager = createUrlStateManager()

// Example content computed property
const exampleContent = computed(() => {
  return generateConversation(
    messagesPerConversation.value,
    userQueryWords.value,
    chunksPerQuery.value,
    wordsPerChunk.value,
    responseWords.value
  )
})

// Add randomization functions
const randomizeSettings = () => {
  // Randomize within reasonable bounds, but keep dailyUsers unchanged
  conversationsPerUser.value = Math.floor(Math.random() * 5) + 1 // 1-5
  messagesPerConversation.value = Math.floor(Math.random() * 7) + 3 // 3-10
  wordsPerChunk.value = Math.floor(Math.random() * 300) + 100 // 100-400
  userQueryWords.value = Math.floor(Math.random() * 32) + 8 // 8-40
  responseWords.value = Math.floor(Math.random() * 90) + 30 // 30-120
  chunksPerQuery.value = Math.floor(Math.random() * 3) + 1 // 1-3
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
  return calculateCosts({
    selectedModel: selectedModel.value,
    dailyUsers: dailyUsers.value,
    conversationsPerUser: conversationsPerUser.value,
    messagesPerConversation: messagesPerConversation.value,
    wordsPerChunk: wordsPerChunk.value,
    userQueryWords: userQueryWords.value,
    responseWords: responseWords.value,
    chunksPerQuery: chunksPerQuery.value
  })
})

// Add watch for state changes
watch(
  [
    dailyUsers,
    conversationsPerUser,
    messagesPerConversation,
    wordsPerChunk,
    userQueryWords,
    responseWords,
    chunksPerQuery,
    selectedModel
  ],
  () => {
    urlStateManager.saveState({
      dailyUsers: dailyUsers.value,
      conversationsPerUser: conversationsPerUser.value,
      messagesPerConversation: messagesPerConversation.value,
      wordsPerChunk: wordsPerChunk.value,
      userQueryWords: userQueryWords.value,
      responseWords: responseWords.value,
      chunksPerQuery: chunksPerQuery.value,
      selectedModel: selectedModel.value
    })
  },
  { deep: true }
)

// Load state on mount
onMounted(() => {
  const savedState = urlStateManager.loadState()
  if (savedState) {
    dailyUsers.value = savedState.dailyUsers ?? dailyUsers.value
    conversationsPerUser.value = savedState.conversationsPerUser ?? conversationsPerUser.value
    messagesPerConversation.value = savedState.messagesPerConversation ?? messagesPerConversation.value
    wordsPerChunk.value = savedState.wordsPerChunk ?? wordsPerChunk.value
    userQueryWords.value = savedState.userQueryWords ?? userQueryWords.value
    responseWords.value = savedState.responseWords ?? responseWords.value
    chunksPerQuery.value = savedState.chunksPerQuery ?? chunksPerQuery.value
    selectedModel.value = savedState.selectedModel ?? selectedModel.value
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
                <p class="text-sm font-medium text-green-800 mb-1">Average History Tokens</p>
                <p class="text-2xl font-semibold">{{ calculations.averageHistoryTokens }} <span class="text-sm text-gray-600">tokens</span></p>
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
              <div class="bg-white p-4 rounded-lg shadow-sm">
                <p class="text-sm font-medium text-green-800 mb-1">Cost per Message (30 days)</p>
                <p class="text-2xl font-semibold">${{ calculations.costPerMessage.toFixed(4) }}</p>
              </div>
              <div class="bg-white p-4 rounded-lg shadow-sm">
                <p class="text-sm font-medium text-green-800 mb-1">Cost per User (30 days)</p>
                <p class="text-2xl font-semibold">${{ calculations.costPerUser.toFixed(2) }}</p>
              </div>
              <div class="bg-white p-4 rounded-lg shadow-sm">
                <p class="text-sm font-medium text-green-800 mb-1">Projected Annual Cost</p>
                <p class="text-2xl font-semibold">${{ calculations.annualCost.toFixed(2) }}</p>
              </div>
            </div>
          </div>

          <!-- Backcheck Results -->
          <div class="bg-yellow-50 p-6 rounded-xl border border-yellow-100">
            <h3 class="text-xl font-bold text-yellow-900 mb-4">Calculation Validation</h3>
            <div v-if="calculations.backcheck" class="space-y-4">
              <div class="flex items-center space-x-2">
                <span class="font-medium text-yellow-800">Validation Status:</span>
                <span 
                  :class="calculations.backcheck.isValid ? 'text-green-600' : 'text-red-600'"
                  class="font-semibold"
                >
                  {{ calculations.backcheck.isValid ? 'Valid' : 'Invalid' }}
                </span>
              </div>

              <div class="grid grid-cols-2 gap-6">
                <!-- Total Messages -->
                <div class="bg-white p-4 rounded-lg shadow-sm">
                  <p class="text-sm font-medium text-yellow-800 mb-2">Total Messages Validation</p>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600">Expected:</span>
                    <span class="font-semibold">{{ calculations.backcheck.details.expectedValues.totalMessages }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600">Actual:</span>
                    <span class="font-semibold">{{ calculations.backcheck.details.actualValues.totalMessages }}</span>
                  </div>
                  <div class="mt-2 flex items-center space-x-2">
                    <span class="text-sm">Status:</span>
                    <span 
                      :class="calculations.backcheck.details.totalMessagesMatch ? 'text-green-600' : 'text-red-600'"
                      class="text-sm font-semibold"
                    >
                      {{ calculations.backcheck.details.totalMessagesMatch ? 'Match' : 'Mismatch' }}
                    </span>
                  </div>
                </div>

                <!-- Daily Cost -->
                <div class="bg-white p-4 rounded-lg shadow-sm">
                  <p class="text-sm font-medium text-yellow-800 mb-2">Daily Cost Validation</p>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600">Expected:</span>
                    <span class="font-semibold">${{ calculations.backcheck.details.expectedValues.dailyCost.toFixed(4) }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600">Actual:</span>
                    <span class="font-semibold">${{ calculations.backcheck.details.actualValues.dailyCost.toFixed(4) }}</span>
                  </div>
                  <div class="mt-2 flex items-center space-x-2">
                    <span class="text-sm">Status:</span>
                    <span 
                      :class="calculations.backcheck.details.dailyCostMatch ? 'text-green-600' : 'text-red-600'"
                      class="text-sm font-semibold"
                    >
                      {{ calculations.backcheck.details.dailyCostMatch ? 'Match' : 'Mismatch' }}
                    </span>
                  </div>
                </div>

                <!-- Input Tokens -->
                <div class="bg-white p-4 rounded-lg shadow-sm">
                  <p class="text-sm font-medium text-yellow-800 mb-2">Input Tokens Validation</p>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600">Expected:</span>
                    <span class="font-semibold">{{ calculations.backcheck.details.expectedValues.inputTokens }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600">Actual:</span>
                    <span class="font-semibold">{{ calculations.backcheck.details.actualValues.inputTokens }}</span>
                  </div>
                  <div class="mt-2 flex items-center space-x-2">
                    <span class="text-sm">Status:</span>
                    <span 
                      :class="calculations.backcheck.details.inputTokensMatch ? 'text-green-600' : 'text-red-600'"
                      class="text-sm font-semibold"
                    >
                      {{ calculations.backcheck.details.inputTokensMatch ? 'Match' : 'Mismatch' }}
                    </span>
                  </div>
                </div>

                <!-- Output Tokens -->
                <div class="bg-white p-4 rounded-lg shadow-sm">
                  <p class="text-sm font-medium text-yellow-800 mb-2">Output Tokens Validation</p>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600">Expected:</span>
                    <span class="font-semibold">{{ calculations.backcheck.details.expectedValues.outputTokens }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600">Actual:</span>
                    <span class="font-semibold">{{ calculations.backcheck.details.actualValues.outputTokens }}</span>
                  </div>
                  <div class="mt-2 flex items-center space-x-2">
                    <span class="text-sm">Status:</span>
                    <span 
                      :class="calculations.backcheck.details.outputTokensMatch ? 'text-green-600' : 'text-red-600'"
                      class="text-sm font-semibold"
                    >
                      {{ calculations.backcheck.details.outputTokensMatch ? 'Match' : 'Mismatch' }}
                    </span>
                  </div>
                </div>
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
              Input tokens per message = (Chunks × Words per Chunk × 1.33) + (Query Words × 1.33) + History Tokens
            </li>
            <li class="flex items-start">
              <span class="text-gray-400 mr-2">•</span>
              History tokens include all previous messages in the conversation (both user queries and AI responses)
            </li>
            <li class="flex items-start">
              <span class="text-gray-400 mr-2">•</span>
              Monthly costs assume 30 days, annual costs use 365 days
            </li>
          </ul>
        </div>

        <!-- Example Content -->
        <div class="mt-8 bg-purple-50 p-6 rounded-xl border border-purple-100">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold text-purple-900">Example Conversation Flow</h3>
            <button 
              @click="randomizeSettings"
              class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors duration-200 flex items-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
              </svg>
              <span>Randomize Example</span>
            </button>
          </div>
          
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
