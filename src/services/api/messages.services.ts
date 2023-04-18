import { MaxInt } from '@/common/consts'
import MessagesDao from '@/dao/messages.dao'
import { ObjectId } from 'mongodb'

export default {
  getMessages: async (conversationId: ObjectId, skip: number = 0, limit: number = MaxInt) => {
    return MessagesDao.getMessages(conversationId, skip, limit)
  },
}