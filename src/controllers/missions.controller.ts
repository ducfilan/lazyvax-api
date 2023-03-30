import missionsServices from '@services/api/missions.services'

export default class MissionsController {
  static async apiGetMissions(req, res) {
    try {
      const { ids } = req.body
      return res.json(await missionsServices.getMissions(ids))
    } catch (e) {
      console.log(`api, ${e}`)
      res.status(500).json({ error: e })
    }
  }
}
