import { jest, describe, test, expect, beforeAll, afterAll, afterEach } from '@jest/globals'
import { MongoClient, ObjectId } from 'mongodb'

import supertest from 'supertest'
import app from '../../../src/app'
import { injectTables } from '../../../src/common/configs/mongodb-client.config'
import { CacheKeyRandomSet, CacheTypeUserRandomSet, InteractionLike, InteractionSubscribe, MaxRegistrationsStep, SupportingPagesLength } from '../../../src/common/consts'
import { resetDb } from '../../config/helpers'
import { addUser, getById, mockUserFinishedSetup } from '../../repo/users'
import { genNumbersArray } from '../../../src/common/utils/arrayUtils'
import { getCache, setCache } from '../../../src/common/redis'
import { addSet } from '../../repo/sets'
import { addInteraction } from '../../repo/interactions'

let mongodbClient: MongoClient
let request: supertest.SuperTest<supertest.Test>

jest.mock('../../../src/middlewares/global/auth.mw', () => jest.fn(async (req, res, next) => {
  req.user = mockUserFinishedSetup

  next()
}))

describe('Users APIs test', () => {
  beforeAll(async () => {
    jest.resetModules()
    mongodbClient = await injectTables()

    request = supertest(app)
  })

  afterEach(async () => {
    await resetDb(mongodbClient)
  })

  afterAll(async () => {
    console.log('After all tests have executed')
    await mongodbClient.close(true)
  })

  test('apiUpdateUser_when_updateFinishedRegisterStep_should_finishedRegisterStepIsUpdated', async () => {
    const userId = await addUser(mongodbClient, mockUserFinishedSetup)

    const res = await request
      .patch('/api/v1/users/me')
      .send({
        finishedRegisterStep: mockUserFinishedSetup.finishedRegisterStep - 1
      })
    const updatedUser = await getById(mongodbClient, userId)

    expect(res.statusCode).toEqual(200)
    expect(updatedUser).not.toBeNull()
    expect(updatedUser!.finishedRegisterStep).toEqual(mockUserFinishedSetup.finishedRegisterStep - 1)
  })

  test('apiUpdateUser_when_updatePages_should_pagesAreUpdated', async () => {
    const userId = await addUser(mongodbClient, mockUserFinishedSetup)

    const res = await request
      .patch('/api/v1/users/me')
      .send({
        pages: mockUserFinishedSetup.pages.slice(1)
      })
    const updatedUser = await getById(mongodbClient, userId)

    expect(res.statusCode).toEqual(200)
    expect(updatedUser).not.toBeNull()
    expect(updatedUser!.pages).toHaveLength(mockUserFinishedSetup.pages.length - 1)
    expect(updatedUser!.pages).not.toContain(mockUserFinishedSetup.pages[0])
    expect(updatedUser!.pages.sort()).toEqual(mockUserFinishedSetup.pages.slice(1).sort())
  })

  test('apiUpdateUser_when_updateLangCodes_should_langCodesAreUpdated', async () => {
    const userId = await addUser(mongodbClient, mockUserFinishedSetup)

    const res = await request
      .patch('/api/v1/users/me')
      .send({
        langCodes: mockUserFinishedSetup.langCodes.slice(1)
      })
    const updatedUser = await getById(mongodbClient, userId)

    expect(res.statusCode).toEqual(200)
    expect(updatedUser).not.toBeNull()
    expect(updatedUser!.langCodes).toHaveLength(mockUserFinishedSetup.langCodes.length - 1)
    expect(updatedUser!.langCodes).not.toContain(mockUserFinishedSetup.langCodes[0])
    expect(updatedUser!.langCodes.sort()).toEqual(mockUserFinishedSetup.langCodes.slice(1).sort())
  })

  test('apiUpdateUser_when_noPropertiesProvided_should_responseValidationError', async () => {
    await addUser(mongodbClient, mockUserFinishedSetup)

    const res = await request
      .patch('/api/v1/users/me')
      .send({})

    expect(res.statusCode).toEqual(422)
    expect(res.body.error).toEqual('required one of finishedRegisterStep/langCodes/pages is not provided')
  })

  test('apiUpdateUser_when_negativeFinishedRegisterStep_should_responseValidationError', async () => {
    await addUser(mongodbClient, mockUserFinishedSetup)

    const res = await request
      .patch('/api/v1/users/me')
      .send({
        finishedRegisterStep: -1
      })

    expect(res.statusCode).toEqual(422)
    expect(res.body.error).toEqual(`finishedRegisterStep - should be positive and less than or equal ${MaxRegistrationsStep}!`)
  })

  test('apiUpdateUser_when_outOfRangeFinishedRegisterStep_should_responseValidationError', async () => {
    await addUser(mongodbClient, mockUserFinishedSetup)

    const res = await request
      .patch('/api/v1/users/me')
      .send({
        finishedRegisterStep: MaxRegistrationsStep + 1
      })

    expect(res.statusCode).toEqual(422)
    expect(res.body.error).toEqual(`finishedRegisterStep - should be positive and less than or equal ${MaxRegistrationsStep}!`)
  })

  test('apiUpdateUser_when_sendNotSupportedLangCode_should_responseValidationError', async () => {
    await addUser(mongodbClient, mockUserFinishedSetup)

    const res = await request
      .patch('/api/v1/users/me')
      .send({
        langCodes: ['xx']
      })

    expect(res.statusCode).toEqual(422)
    expect(res.body.error).toEqual('langCodes - Invalid value')
  })

  test('apiUpdateUser_when_sendNotArrayLangCode_should_responseValidationError', async () => {
    await addUser(mongodbClient, mockUserFinishedSetup)

    const res = await request
      .patch('/api/v1/users/me')
      .send({
        langCodes: 'vi'
      })

    expect(res.statusCode).toEqual(422)
    expect(res.body.error).toEqual('langCodes - Invalid value')
  })

  test('apiUpdateUser_when_sendNotArrayPages_should_responseValidationError', async () => {
    await addUser(mongodbClient, mockUserFinishedSetup)

    const res = await request
      .patch('/api/v1/users/me')
      .send({
        pages: 'facebook'
      })

    expect(res.statusCode).toEqual(422)
    expect(res.body.error).toEqual('pages - too many pages, supporting 9')
  })

  test('apiUpdateUser_when_sendTooLongArrayPages_should_responseValidationError', async () => {
    await addUser(mongodbClient, mockUserFinishedSetup)

    const res = await request
      .patch('/api/v1/users/me')
      .send({
        pages: genNumbersArray(SupportingPagesLength + 11).map(number => `page_${number}`)
      })

    expect(res.statusCode).toEqual(422)
    expect(res.body.error).toEqual(`pages - too many pages, supporting ${SupportingPagesLength}`)
  })

  test('apiUpdateUser_when_sendNotUpdatableProperty_should_notUpdate', async () => {
    const userId = await addUser(mongodbClient, mockUserFinishedSetup)

    const res = await request
      .patch('/api/v1/users/me')
      .send({
        finishedRegisterStep: mockUserFinishedSetup.finishedRegisterStep - 1,
        langCodes: mockUserFinishedSetup.langCodes.slice(1),
        pages: ['facebook'],
        email: 'hacker@gmail.com',
      })
    const updatedUser = await getById(mongodbClient, userId)

    expect(res.statusCode).toEqual(200)
    expect(updatedUser).not.toBeNull()
    expect(updatedUser!.email).toEqual(mockUserFinishedSetup.email)
  })

  test('apiDeleteCache_when_noCacheType_should_responseValidationError', async () => {
    const res = await request
      .delete(`/api/v1/users/cache?cacheType=`)

    expect(res.statusCode).toEqual(422)
    expect(res.body.error).toEqual('cacheType - should not be empty!')
  })

  test('apiDeleteCache_when_wrongCacheType_should_responseValidationError', async () => {
    const res = await request
      .delete(`/api/v1/users/cache?cacheType=not-allowed`)

    expect(res.statusCode).toEqual(422)
    expect(res.body.error).toEqual('cacheType - invalid value!')
  })

  test('apiDeleteCache_when_correctCacheType_should_removeTargetCache', async () => {
    const userId = await addUser(mongodbClient, mockUserFinishedSetup)

    const cacheKeys = [[0, 20], [20, 40]].map(([skip, limit]) => CacheKeyRandomSet(userId.toString(), [InteractionSubscribe], skip, limit))
    await Promise.all(cacheKeys.map(key => setCache(key, `test - ${key}`)))
    let redisValues = await Promise.all(cacheKeys.map(key => getCache(key)))

    redisValues.forEach((value, i) => expect(value).toEqual(`test - ${cacheKeys[i]}`))

    const res = await request
      .delete(`/api/v1/users/cache?cacheType=${CacheTypeUserRandomSet}`)

    await new Promise((r) => setTimeout(r, 100))

    expect(res.statusCode).toEqual(200)

    redisValues = await Promise.all(cacheKeys.map(key => getCache(key)))
    redisValues.forEach(value => expect(value).toBeNull())
  })

  test('getUserSets_when_noLimit_should_responseValidationError', async () => {
    const res = await request
      .get(`/api/v1/users/${mockUserFinishedSetup._id.toString()}/sets?interaction=subscribe&skip=0&limit=`)

    expect(res.statusCode).toEqual(422)
    expect(res.body.error).toEqual('limit - Invalid value')
  })

  test('getUserSets_when_noSkip_should_responseValidationError', async () => {
    const res = await request
      .get(`/api/v1/users/${mockUserFinishedSetup._id.toString()}/sets?interaction=subscribe&skip=&limit=1`)

    expect(res.statusCode).toEqual(422)
    expect(res.body.error).toEqual('skip - Invalid value')
  })

  test('getUserSets_when_noInteraction_should_responseValidationError', async () => {
    const res = await request
      .get(`/api/v1/users/${mockUserFinishedSetup._id.toString()}/sets?interaction=&skip=0&limit=1`)

    expect(res.statusCode).toEqual(422)
    expect(res.body.error).toEqual('interaction - Invalid value')
  })

  test('getUserSets_when_haveSetsForUser_should_returnSets', async () => {
    const categoryId = new ObjectId("6197093dfaf522d08fa52777")
    const set = {
      name: `Set name ${1}`,
      categoryId,
      description: `Set description ${1}`,
      tags: [1, 2].map(i => `tag_#${i}`),
      fromLanguage: "en",
      toLanguage: "vi",
      items: genNumbersArray(3, 0).map(i => (
        {
          type: "term-def",
          term: `term ${i}`,
          definition: `def ${i}`,
          _id: new ObjectId()
        }
      )),
      creatorId: mockUserFinishedSetup._id,
      lastUpdated: new Date(),
      delFlag: false,
      imgUrl: "https://static.lazyvax.com/6485262474387409_1154016863529960_1638961954008.jpg",
    }
    const setId = await addSet(mongodbClient, set)

    const actions = [InteractionSubscribe, InteractionLike]
    await addInteraction(mongodbClient, setId, mockUserFinishedSetup._id, actions)

    const res = await request
      .get(`/api/v1/users/${mockUserFinishedSetup._id.toString()}/sets?interaction=subscribe&skip=0&limit=1`)

    expect(res.statusCode).toEqual(200)
    expect(res.body.sets).toHaveLength(1)
    expect(res.body.sets[0].set._id.toString()).toEqual(setId.toString())
    expect(res.body.sets[0].actions).toEqual(actions)
  })

  test('getUserSets_when_interactionCreate_should_returnCreatedSets', async () => {
    await addUser(mongodbClient, mockUserFinishedSetup)
    const categoryId = new ObjectId("6197093dfaf522d08fa52777");
    [1, 2].forEach(async (i) => {
      const set = {
        name: `Set name ${i}`,
        categoryId,
        description: `Set description ${i}`,
        tags: [1, 2].map(i => `tag_#${i}`),
        fromLanguage: "en",
        toLanguage: "vi",
        items: genNumbersArray(3, 0).map(i => (
          {
            type: "term-def",
            term: `term ${i}`,
            definition: `def ${i}`,
            _id: new ObjectId()
          }
        )),
        creatorId: mockUserFinishedSetup._id,
        lastUpdated: new Date(),
        delFlag: false,
        imgUrl: "https://static.lazyvax.com/6485262474387409_1154016863529960_1638961954008.jpg",
      }

      await addSet(mongodbClient, set)
    })

    const res = await request
      .get(`/api/v1/users/${mockUserFinishedSetup._id.toString()}/sets?interaction=create&skip=0&limit=1`)

    expect(res.statusCode).toEqual(200)
    expect(res.body.total).toEqual(2)
    expect(res.body.sets).toHaveLength(1)
    expect(res.body.sets[0].actions).toHaveLength(0)
  })

  test('getUserSets_when_interactionCreateWithInteractions_should_returnCreatedSetsWithInteractions', async () => {
    await addUser(mongodbClient, mockUserFinishedSetup)
    const categoryId = new ObjectId("6197093dfaf522d08fa52777")
    const setIds: ObjectId[] = [];

    await new Promise((resolve, reject) => {
      [1, 2].forEach(async (i) => {
        const set = {
          name: `Set name ${i}`,
          categoryId,
          description: `Set description ${i}`,
          tags: [1, 2].map(i => `tag_#${i}`),
          fromLanguage: "en",
          toLanguage: "vi",
          items: genNumbersArray(3, 0).map(i => (
            {
              type: "term-def",
              term: `term ${i}`,
              definition: `def ${i}`,
              _id: new ObjectId()
            }
          )),
          creatorId: mockUserFinishedSetup._id,
          lastUpdated: new Date(),
          delFlag: false,
          imgUrl: "https://static.lazyvax.com/6485262474387409_1154016863529960_1638961954008.jpg",
        }

        const setId = await addSet(mongodbClient, set)
        setIds.push(setId)

        i === 2 && resolve(true)
      })
    })

    const actions = [InteractionSubscribe, InteractionLike]
    await addInteraction(mongodbClient, setIds[0], mockUserFinishedSetup._id, actions)

    const res = await request
      .get(`/api/v1/users/${mockUserFinishedSetup._id.toString()}/sets?interaction=create&skip=0&limit=5`)

    const sets = res.body.sets.sort((a, b) => a.set.name.localeCompare(b.set.name))

    expect(res.statusCode).toEqual(200)
    expect(res.body.total).toEqual(2)
    expect(sets).toHaveLength(2)
    expect(sets[0].actions).toEqual(actions)
  })
})

// TODO: Test getUserRandomSet