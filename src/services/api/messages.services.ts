import { MaxInt } from '@/common/consts'
import MessagesDao from '@/dao/messages.dao'
import { Message } from '@/models/Message'
import { ObjectId } from 'mongodb'

export async function saveMessage(message: Message) {
  return MessagesDao.insertOne(message)
}

export default {
  getMessages: async (conversationId: ObjectId, skip: number = 0, limit: number = MaxInt) => {
    return MessagesDao.getMessages(conversationId, skip, limit)
  },

  saveMessage
}