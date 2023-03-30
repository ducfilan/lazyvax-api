import usersServices from '@services/api/users.services'

export default class ItemsStatisticsController {
  static async apiGetStatistics(req, res) {
    try {
      const { beginDate, endDate } = req.query
      const userId = req.user._id
      return res.json(await usersServices.getUserStatistics(userId, beginDate, endDate))
    } catch (e) {
      console.log(`api, ${e}`)
      res.status(500).json({ error: e })
    }
  }
}
