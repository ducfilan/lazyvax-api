import logger from '@/common/logger'
import { getEvents } from '@/services/api/event.services'

export default class EventController {
  static async getEvents(req, res) {
    try {
      const events = await getEvents()

      res.status(200).send(events)
    } catch (e) {
      logger.error('error: ' + e)
      res.status(500).json({ error: e.message })
    }
  }
}
