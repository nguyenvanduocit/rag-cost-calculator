export interface Conversation {
  userQuery: string;
  chunks: string[];
  response: string;
}

export interface ConversationContent {
  conversation: Conversation[];
}

// Helper functions for generating example content
export const generateRandomText = (wordCount: number): string => {
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

export const generateConversation = (
  messagesCount: number,
  userQueryWords: number,
  chunksPerQuery: number,
  wordsPerChunk: number,
  responseWords: number
): ConversationContent => {
  const conversation = []
  for (let i = 0; i < messagesCount; i++) {
    conversation.push({
      userQuery: generateRandomText(userQueryWords),
      chunks: Array.from({ length: chunksPerQuery }, () => generateRandomText(wordsPerChunk)),
      response: generateRandomText(responseWords)
    })
  }
  return {
    conversation
  }
} 