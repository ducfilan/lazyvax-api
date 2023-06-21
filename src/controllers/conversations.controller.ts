import { getConversation, updateById } from '@/services/api/conversations.services'
import { getMessages } from '@services/api/messages.services'

export default class ConversationsController {
  static async getConversation(req, res) {
    try {
      const { conversationId } = req.params
      const conversationInfo = await getConversation(conversationId)

      res.status(200).send(conversationInfo)
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  }

  static async updateConversation(req, res) {
    try {
      const { conversationId } = req.params
      await updateById(conversationId, { $set: req.body.updateProperties })

      res.sendStatus(200)
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  }

  static async getMessages(req, res) {
    try {
      const { conversationId } = req.params
      const { skip, limit } = req.query
      const messages = await getMessages(conversationId, skip, limit)

      res.status(200).send(messages)
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  }
}
