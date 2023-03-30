import TagsDao from '@dao/tags.dao'

export default class TagsController {
  static async apiGetTagsStartWith(req, res, next) {
    try {
      let start_with = req.params.start_with

      return res.json(await TagsDao.getTagsStartWith(start_with))
    } catch (e) {
      console.log(`api, ${e}`)
      res.status(500).json({ error: e })
    }
  }

  static async apiCreateTag(req, res, next) {
    try {
      const tag = req.body.tag

      if (!tag) {
        res.status(400).json({ error: 'Tag must not be empty' })
      }

      const isTagExists = !!(await TagsDao.findOne(tag))

      if (isTagExists) {
        res.status(409).json({ error: 'Tag already exists' })
      } else {
        return res.json(await TagsDao.createTag(tag))
      }
    } catch (e) {
      console.log(`api, ${e}`)
      res.status(500).json({ error: e })
    }
  }
}
