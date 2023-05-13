import { CacheKeyConversation, ConversationTypeGoal, I18nDbCodeGoalFirstMessage } from "@/common/consts"
import { delCache, getCache } from "@/common/redis"
import ConversationsDao from "@/dao/conversations.dao"
import I18nDao from "@/dao/i18n"
import { Conversation, SmartQuestion } from "@/models/Conversation"
import { I18n } from "@/models/I18n"
import { ObjectId } from "mongodb"

export async function isParticipantInConversation(userId: ObjectId, conversationId: ObjectId): Promise<boolean> {
  const conversation = await ConversationsDao.findById(conversationId)
  return conversation.participants.some(((p) => p._id.equals(userId)))
}

export async function createConversation(conversation: Conversation) {
  return ConversationsDao.insertOne(conversation)
}

export async function updateConversation(conversationId: ObjectId, updateOperations) {
  delCache(CacheKeyConversation(conversationId.toHexString()))

  return ConversationsDao.updateOneById(conversationId, updateOperations)
}

export async function updateSmartQuestionAnswer(conversationId: ObjectId, question: string, answer: string, answerUserId: ObjectId) {
  delCache(CacheKeyConversation(conversationId.toHexString()))

  return ConversationsDao.updateOne(
    {
      _id: conversationId,
      'smartQuestions.content': question.trim()
    },
    {
      $set: {
        'smartQuestions.$.answer': answer,
        'smartQuestions.$.answerUserId': answerUserId
      }
    }
  )
}

export async function getSmartQuestions(conversationId: ObjectId): Promise<SmartQuestion[]> {
  const conversationCache = await getCache(CacheKeyConversation(conversationId.toHexString()))
  if (conversationCache) return conversationCache.smartQuestions as SmartQuestion[]

  const result = await ConversationsDao.findById(conversationId, { smartQuestions: 1 })
  if (!result) return []

  return result.smartQuestions as SmartQuestion[]
}

export async function generateFirstMessages(conversationType: string, locale: string): Promise<I18n[]> {
  switch (conversationType) {
    case ConversationTypeGoal:
      return I18nDao.getByCode(I18nDbCodeGoalFirstMessage, locale)

    default:
      return []
  }
}
