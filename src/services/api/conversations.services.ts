import ConversationsDao from "@/dao/conversations.dao"
import { Conversation } from "@/models/Conversation"
import { ObjectId } from "mongodb"

export async function isParticipantInConversation(userId: ObjectId, conversationId: ObjectId): Promise<boolean> {
  const conversation = await ConversationsDao.findOne(conversationId)
  return conversation.participants.some(((p) => p._id.equals(userId)))
}

export async function createConversation(conversation: Conversation) {
  return ConversationsDao.insertOne(conversation)
}