import usersServices from '@services/api/users.services'

export default class SetsStatisticController {
  static async apiGetSetsStatistics(req, res) {
    try {
      const userId = req.user._id
      return res.json(await usersServices.getSetsStatistics(userId))
    } catch (e) {
      console.log(`api, ${e}`)
      res.status(500).json({ error: e })
    }
  }
}