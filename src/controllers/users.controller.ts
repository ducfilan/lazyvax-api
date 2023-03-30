import usersServices from '@services/api/users.services'
import setsServices from '@services/api/sets.services'
import { apiSearchSetValidator } from '@validators/sets.validator'
import { ObjectId } from 'mongodb'
import { deleteCache } from '@services/support/redis.service'
import { User } from '@common/types'

export default class UsersController {
  static async me(req, res) {
    return res.status(200).json(req.user)
  }

  static async getUserInfo(req, res) {
    try {
      const userInfo = await usersServices.getUserInfoById(new ObjectId(req.params.userId))

      res.status(200).send(userInfo)
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  }

  static async getUserSets(req, res) {
    try {
      const { interaction, skip, limit } = req.query
      const sets = await usersServices.getUserSets(req.params.userId, interaction, skip, limit)

      res.status(200).send(sets)
    } catch (e) {
      console.log(`api, ${e}`)
      res.status(500).json({ error: e })
    }
  }

  static async getUserRandomSet(req: { query: { interactions: string[], itemsSkip: number, itemsLimit: number }, user: User }, res) {
    try {
      const { interactions, itemsSkip, itemsLimit } = req.query
      const set = await usersServices.getUserRandomSet(req.user._id, interactions, itemsSkip, itemsLimit)

      res.status(200).send(set)
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  }

  static async register(req, res) {
    try {
      const registeredUserId = await usersServices.register(req.body)
      const registeredUser = await usersServices.getUserInfoById(registeredUserId)

      res.status(200).send(registeredUser)
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  }

  static async update(req, res) {
    try {
      const isSuccess = await usersServices.update(req.user, req.body.updateProperties)
      if (!isSuccess) {
        res.status(400).json({ error: 'update user failed' })
      }

      res.sendStatus(200)
    } catch (e) {
      res.status(400).send({ error: e.message })
    }
  }

  static async logout(req, res) {
    try {
      await usersServices.logout(req.user)

      res.sendStatus(200)
    } catch (e) {
      res.status(500).send({ error: e.message })
    }
  }

  static async apiSuggestSets(req, res) {
    try {
      const searchConditions = apiSearchSetValidator(req.query, req.user.langCodes)
      if (!searchConditions) res.sendStatus(400)

      return res.json(await setsServices.suggestSets(req.user._id, searchConditions))
    } catch (e) {
      console.log(`api, ${e}`)
      res.status(500).json({ error: e })
    }
  }

  static async apiDeleteCache(req, res) {
    try {
      await deleteCache(req.user._id, req.query.cacheType)

      res.status(200).send()
    } catch (e) {
      console.log(`api, ${e}`)
      res.status(500).json({ error: e })
    }
  }
}
