import { ObjectId } from 'mongodb'
import ConversationMemoryDao from '@/dao/conversation_memories.dao'
import logger from '@/common/logger'

export const createConversationMemory = async (conversationId: ObjectId, type: string) => {
  try {
    const memory = {
      conversationId,
      meta: {
        type,
        weekAiMemory: '',
        dayAiMemory: Array(7).fill('')
      }
    }

    return await ConversationMemoryDao.insertOne(memory)
  } catch (error) {
    logger.error('Error in createConversationMemory:', error)
    throw error
  }
}

export const getConversationMemoryByConversationId = async (conversationId: ObjectId) => {
  try {
    return await ConversationMemoryDao.findByConversationId(conversationId)
  } catch (error) {
    logger.error('Error in getConversationMemoryByConversationId:', error)
    throw error
  }
}

export const updateConversationMemory = async (findCondition: any, updateOperations: any) => {
  try {
    return await ConversationMemoryDao.updateOne(findCondition, updateOperations)
  } catch (error) {
    logger.error('Error in updateConversationMemory:', error)
    throw error
  }
}

export const updateConversationMemoryByConversationId = async (conversationId: ObjectId, updateOperations: any) => {
  try {
    return await ConversationMemoryDao.updateByConversationId(conversationId, updateOperations)
  } catch (error) {
    logger.error('Error in updateConversationMemoryByConversationId:', error)
    throw error
  }
}

