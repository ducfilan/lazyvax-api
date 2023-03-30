import MissionsDao from '@dao/missions.dao'

export default {
  getMissions: async (ids) => {
    const missions = await MissionsDao.getMissions(ids)
    return missions
  }
}
