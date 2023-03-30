import setsServices from '@services/api/sets.services'

export default class InteractionsController {
  static async apiInteractSet(req, res) {
    try {
      const { action } = req.query
      const setId = req.params.setId
      const userId = req.user._id

      await setsServices.interactSet(action, userId, setId)

      res.status(200).send()
    } catch (e) {
      console.log(`api, ${e}`)
      res.status(500).json({ error: e })
    }
  }

  static async apiUndoInteractSet(req, res) {
    try {
      const { action } = req.query
      const setId = req.params.setId
      const userId = req.user._id

      await setsServices.undoInteractSet(action, userId, setId)

      res.status(200).send()
    } catch (e) {
      console.log(`api, ${e}`)
      res.status(500).json({ error: e })
    }
  }

  static async apiUploadTestResult(req, res) {
    try {
      const setId = req.params.setId
      const userId = req.user._id
      const {result} = req.body

      await setsServices.uploadTestResult(userId, setId, result)

      res.status(200).send()
    } catch (e) {
      console.log(`api, ${e}`)
      res.status(500).json({ error: e })
    }
  }
}
