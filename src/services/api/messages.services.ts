import { MaxInt } from '@/common/consts'
import ConversationsDao from '@/dao/conversations.dao'
import MessagesDao from '@/dao/messages.dao'
import { Message } from '@/models/Message'
import { ObjectId } from 'mongodb'

export async function saveMessage(message: Message) {
  return MessagesDao.insertOne(message)
}

export async function getMessages(conversationId: ObjectId, skip: number = 0, limit: number = MaxInt) {
  return MessagesDao.getMessages(conversationId, skip, limit)
}

export async function getConversation(conversationId: ObjectId) {
  return ConversationsDao.findById(conversationId)
}

export default {
  getConversation,
  getMessages,
  saveMessage
}
