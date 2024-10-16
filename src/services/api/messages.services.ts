import { MaxInt } from '@/common/consts'
import logger from '@/common/logger'
import MessagesDao from '@/dao/messages.dao'
import { Message } from '@/entities/Message'
import { ObjectId } from 'mongodb'

export async function saveMessage(message: Message) {
  try {
    return await MessagesDao.insertOne(message)
  } catch (error) {
    logger.error("failed to save message, ", message, error)
  }
}

export async function markMessageResponded(_id: ObjectId) {
  return MessagesDao.updateOne({ _id }, { $set: { isResponded: true } })
}

export async function getMessages(conversationId: ObjectId, skip: number = 0, limit: number = MaxInt) {
  return MessagesDao.getMessages(conversationId, skip, limit)
}

export default {
  getMessages,
  saveMessage
}
