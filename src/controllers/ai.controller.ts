import logger from '@/common/logger'
import { getActionCompletion, getFutureSelfSuggestions } from '@/services/api/ai.services'

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
  static async getFutureSelfSuggestions(req, res) {
    try {
      const futureSelfSuggestions = await getFutureSelfSuggestions(req.user)

      res.status(200).send(futureSelfSuggestions)
    } catch (e) {
      logger.error('error: ' + e)
      res.status(500).json({ error: e.message })
    }
  }
}
