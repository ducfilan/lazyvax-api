import { getActionCompletion } from '@/services/api/ai.services'

export default class AiController {
  static async getActionCompletion(req, res) {
    try {
      const { conversationId, milestoneId } = req.query
      const suggestedAction = await getActionCompletion(req.user, conversationId, milestoneId)

      res.status(200).send(suggestedAction)
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  }
}
