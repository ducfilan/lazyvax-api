import messagesServices from '@services/api/messages.services'

export default class ConversationsController {
  static async getMessages(req, res) {
    try {
      const { conversationId } = req.params
      const { skip, limit } = req.query
      const conversationInfo = await messagesServices.getMessages(conversationId, skip, limit)

      res.status(200).send(conversationInfo)
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  }
}
