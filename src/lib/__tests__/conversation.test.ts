import { describe, it, expect } from 'vitest'
import { generateRandomText, generateConversation } from '../conversation'

describe('generateRandomText', () => {
  it('should generate text with the specified number of words', () => {
    const wordCount = 5
    const text = generateRandomText(wordCount)
    expect(text.split(' ')).toHaveLength(wordCount)
  })

  it('should generate different text on each call', () => {
    const text1 = generateRandomText(10)
    const text2 = generateRandomText(10)
    expect(text1).not.toBe(text2)
  })

  it('should only use words from the lorem ipsum list', () => {
    const text = generateRandomText(20)
    const words = text.split(' ')
    const loremWords = [
      'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
      'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
      'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation'
    ]
    words.forEach(word => {
      expect(loremWords).toContain(word)
    })
  })
})

describe('generateConversation', () => {
  it('should generate conversation with specified number of messages', () => {
    const messagesCount = 3
    const result = generateConversation(messagesCount, 5, 2, 10, 15)
    expect(result.conversation).toHaveLength(messagesCount)
  })

  it('should generate messages with correct structure', () => {
    const userQueryWords = 5
    const chunksPerQuery = 2
    const wordsPerChunk = 10
    const responseWords = 15

    const result = generateConversation(1, userQueryWords, chunksPerQuery, wordsPerChunk, responseWords)
    const message = result.conversation[0]

    expect(message.userQuery.split(' ')).toHaveLength(userQueryWords)
    expect(message.chunks).toHaveLength(chunksPerQuery)
    message.chunks.forEach(chunk => {
      expect(chunk.split(' ')).toHaveLength(wordsPerChunk)
    })
    expect(message.response.split(' ')).toHaveLength(responseWords)
  })

  it('should generate unique content for each message', () => {
    const result = generateConversation(2, 5, 2, 10, 15)
    const [message1, message2] = result.conversation
    
    expect(message1.userQuery).not.toBe(message2.userQuery)
    expect(message1.response).not.toBe(message2.response)
    expect(message1.chunks[0]).not.toBe(message2.chunks[0])
  })
}) 