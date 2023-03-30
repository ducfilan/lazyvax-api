import { jest, describe, test, expect, beforeAll, afterAll, afterEach } from '@jest/globals'
import { MongoClient, ObjectId } from 'mongodb'

import supertest from 'supertest'
import app from '../../../src/app'
import { injectTables } from '../../../src/common/configs/mongodb-client.config'
import { ItemsInteractionForcedDone, ItemsInteractionIgnore, ItemsInteractionStar, MaxPaginationLimit } from '../../../src/common/consts'
import { resetDb } from '../../config/helpers'
import { addItemsInteractions } from '../../repo/itemsInteractions'
import { addUser, mockUserFinishedSetup } from '../../repo/users'
import { genNumbersArray } from '../../../src/common/utils/arrayUtils'
import { addSet } from '../../repo/sets'

let mongodbClient: MongoClient
let request: supertest.SuperTest<supertest.Test>

jest.mock('../../../src/middlewares/global/auth.mw', () => jest.fn(async (req, res, next) => {
  req.user = mockUserFinishedSetup

  next()
}))

describe('Items Interactions APIs test', () => {
  beforeAll(async () => {
    jest.resetModules()
    mongodbClient = await injectTables()

    request = supertest(app)
  })

  afterEach(async () => {
    await resetDb(mongodbClient)
  })

  afterAll(async () => {
    console.log("After all tests have executed")
    await mongodbClient.close(true)
  })

  test('apiCountInteractedItems_when_withIgnore_should_returnNotIgnoredInteractionCount', async () => {
    await addUser(mongodbClient, mockUserFinishedSetup)

    const itemsInteractions = [1, 2, 3].map(i => ({
      itemId: new ObjectId(),
      setId: new ObjectId(),
      userId: mockUserFinishedSetup._id,
      interactionCount: {
        [ItemsInteractionStar]: 1,
        [ItemsInteractionForcedDone]: i == 3 ? 1 : 0,
      },
      lastUpdated: new Date(),
      interactionsDetail: []
    }))
    itemsInteractions.forEach(async item => {
      await addItemsInteractions(mongodbClient, item)
    })

    const res = await request
      .get('/api/v1/items-interactions/count?interactionInclude=star&interactionIgnore=forced-done')

    expect(res.statusCode).toEqual(200)
    expect(res.body).toEqual(2)
  })

  test('apiCountInteractedItems_when_withIgnoreMultipleTypes_should_returnNotIgnoredInteractionCount', async () => {
    await addUser(mongodbClient, mockUserFinishedSetup)

    const itemsInteractions = [1, 2, 3].map(i => ({
      itemId: new ObjectId(),
      setId: new ObjectId(),
      userId: mockUserFinishedSetup._id,
      interactionCount: {
        [ItemsInteractionStar]: 1,
        [ItemsInteractionForcedDone]: i == 3 ? 1 : 0,
        [ItemsInteractionIgnore]: i == 2 ? 1 : 0,
      },
      lastUpdated: new Date(),
      interactionsDetail: []
    }))
    itemsInteractions.forEach(async item => {
      await addItemsInteractions(mongodbClient, item)
    })

    const res = await request
      .get(`/api/v1/items-interactions/count?interactionInclude=star&interactionIgnore=${ItemsInteractionForcedDone},${ItemsInteractionIgnore}`)

    expect(res.statusCode).toEqual(200)
    expect(res.body).toEqual(1)
  })

  test('apiCountInteractedItems_when_noIgnore_should_returnAllInteractionCount', async () => {
    await addUser(mongodbClient, mockUserFinishedSetup)

    const itemsInteractions = [1, 2, 3].map(_ => ({
      itemId: new ObjectId(),
      setId: new ObjectId(),
      userId: mockUserFinishedSetup._id,
      interactionCount: {
        [ItemsInteractionStar]: 1,
      },
      lastUpdated: new Date(),
      interactionsDetail: []
    }))
    itemsInteractions.forEach(async item => {
      await addItemsInteractions(mongodbClient, item)
    })

    const res = await request
      .get('/api/v1/items-interactions/count?interactionInclude=star&interactionIgnore=forced-done')

    expect(res.statusCode).toEqual(200)
    expect(res.body).toEqual(3)
  })

  test('apiCountInteractedItems_when_noStar_should_returnZero', async () => {
    const res = await request
      .get('/api/v1/items-interactions/count?interactionInclude=star&interactionIgnore=forced-done')

    expect(res.statusCode).toEqual(200)
    expect(res.body).toEqual(0)
  })

  test('apiGetInteractedItems_when_havingInteractedItemsWithSingleInteractionIgnore_should_returnCorrectItems', async () => {
    const set = {
      name: `Set name ${1}`,
      categoryId: new ObjectId("626f67079187b93c105d1cb8"),
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

    const itemsInteractions = set.items.map((item, i) => ({
      itemId: item._id,
      setId,
      userId: mockUserFinishedSetup._id,
      interactionCount: {
        [ItemsInteractionStar]: 1,
        [ItemsInteractionForcedDone]: i == 1 ? 1 : 0,
        [ItemsInteractionIgnore]: i == 2 ? 1 : 0,
      },
      lastUpdated: new Date(),
      interactionsDetail: []
    }))
    itemsInteractions.forEach(async item => {
      await addItemsInteractions(mongodbClient, item)
    })

    const res = await request
      .get(`/api/v1/items-interactions/items?interactionInclude=${ItemsInteractionStar}&interactionIgnore=${ItemsInteractionForcedDone}&limit=10&skip=0`)

    expect(res.statusCode).toEqual(200)
    expect(res.body).toHaveLength(2)
  })

  test('apiGetInteractedItems_when_havingInteractedItemsWithMultipleInteractionIgnore_should_returnCorrectItems', async () => {
    const set = {
      name: `Set name ${1}`,
      categoryId: new ObjectId("626f67079187b93c105d1cb8"),
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

    const itemsInteractions = set.items.map((item, i) => ({
      itemId: item._id,
      setId,
      userId: mockUserFinishedSetup._id,
      interactionCount: {
        [ItemsInteractionStar]: 1,
        [ItemsInteractionForcedDone]: i == 1 ? 1 : 0,
        [ItemsInteractionIgnore]: i == 2 ? 1 : 0,
      },
      lastUpdated: new Date(),
      interactionsDetail: []
    }))
    itemsInteractions.forEach(async item => {
      await addItemsInteractions(mongodbClient, item)
    })

    const res = await request
      .get(`/api/v1/items-interactions/items?interactionInclude=${ItemsInteractionStar}&interactionIgnore=${ItemsInteractionForcedDone},${ItemsInteractionIgnore}&limit=10&skip=0`)

    expect(res.statusCode).toEqual(200)
    expect(res.body).toHaveLength(1)
  })

  test('apiGetInteractedItems_when_havingInteractedItemsMoreThanLimit_should_returnLimitItems', async () => {
    const set = {
      name: `Set name ${1}`,
      categoryId: new ObjectId("626f67079187b93c105d1cb8"),
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

    const itemsInteractions = set.items.map((item, i) => ({
      itemId: item._id,
      setId,
      userId: mockUserFinishedSetup._id,
      interactionCount: {
        [ItemsInteractionStar]: 1
      },
      lastUpdated: new Date(),
      interactionsDetail: []
    }))
    itemsInteractions.forEach(async item => {
      await addItemsInteractions(mongodbClient, item)
    })

    const res = await request
      .get(`/api/v1/items-interactions/items?interactionInclude=${ItemsInteractionStar}&interactionIgnore=${ItemsInteractionForcedDone},${ItemsInteractionIgnore}&limit=1&skip=0`)

    expect(res.statusCode).toEqual(200)
    expect(res.body).toHaveLength(1)
  })

  test('apiGetInteractedItems_when_havingInteractedItemsWithPositiveSkip_should_notReturnSkippedItems', async () => {
    const set = {
      name: `Set name ${1}`,
      categoryId: new ObjectId("626f67079187b93c105d1cb8"),
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

    const itemsInteractions = set.items.map((item, i) => ({
      itemId: item._id,
      setId,
      userId: mockUserFinishedSetup._id,
      interactionCount: {
        [ItemsInteractionStar]: 1
      },
      lastUpdated: new Date(),
      interactionsDetail: []
    }))
    itemsInteractions.forEach(async item => {
      await addItemsInteractions(mongodbClient, item)
    })

    const res = await request
      .get(`/api/v1/items-interactions/items?interactionInclude=${ItemsInteractionStar}&interactionIgnore=${ItemsInteractionForcedDone},${ItemsInteractionIgnore}&limit=10&skip=1`)

    expect(res.statusCode).toEqual(200)
    expect(res.body).toHaveLength(2)
  })

  test('apiGetInteractedItems_when_noLimit_should_returnValidationError', async () => {
    const res = await request
      .get('/api/v1/items-interactions/items?interactionInclude=star&interactionIgnore=forced-done&limit=&skip=0')

    expect(res.statusCode).toEqual(422)
    expect(res.body.errors.length).toBeGreaterThan(0)
  })

  test('apiGetInteractedItems_when_zeroLimit_should_returnValidationError', async () => {
    const res = await request
      .get('/api/v1/items-interactions/items?interactionInclude=star&interactionIgnore=forced-done&limit=0&skip=0')

    expect(res.statusCode).toEqual(422)
    expect(res.body.errors.length).toBeGreaterThan(0)
  })

  test('apiGetInteractedItems_when_negativeLimit_should_returnValidationError', async () => {
    const res = await request
      .get('/api/v1/items-interactions/items?interactionInclude=star&interactionIgnore=forced-done&limit=-5&skip=0')

    expect(res.statusCode).toEqual(422)
    expect(res.body.errors.length).toBeGreaterThan(0)
  })

  test('apiGetInteractedItems_when_notNumberLimit_should_returnValidationError', async () => {
    const res = await request
      .get('/api/v1/items-interactions/items?interactionInclude=star&interactionIgnore=forced-done&limit=-ten&skip=0')

    expect(res.statusCode).toEqual(422)
    expect(res.body.errors.length).toBeGreaterThan(0)
  })

  test('apiGetInteractedItems_when_notIntLimit_should_returnValidationError', async () => {
    const res = await request
      .get('/api/v1/items-interactions/items?interactionInclude=star&interactionIgnore=forced-done&limit=-1.5&skip=0')

    expect(res.statusCode).toEqual(422)
    expect(res.body.errors.length).toBeGreaterThan(0)
  })

  test('apiGetInteractedItems_when_greaterThanMaxLimit_should_returnValidationError', async () => {
    const res = await request
      .get(`/api/v1/items-interactions/items?interactionInclude=star&interactionIgnore=forced-done&limit=${MaxPaginationLimit + 1}&skip=0`)

    expect(res.statusCode).toEqual(422)
    expect(res.body.errors.length).toBeGreaterThan(0)
  })

  test('apiGetInteractedItems_when_noSkip_should_returnValidationError', async () => {
    const res = await request
      .get('/api/v1/items-interactions/items?interactionInclude=star&interactionIgnore=forced-done&limit=10&skip=')

    expect(res.statusCode).toEqual(422)
    expect(res.body.errors.length).toBeGreaterThan(0)
  })

  test('apiGetInteractedItems_when_noSkip_should_returnValidationError', async () => {
    const res = await request
      .get('/api/v1/items-interactions/items?interactionInclude=star&interactionIgnore=forced-done&limit=10&skip=')

    expect(res.statusCode).toEqual(422)
    expect(res.body.errors.length).toBeGreaterThan(0)
  })

  test('apiGetInteractedItems_when_negativeSkip_should_returnValidationError', async () => {
    const res = await request
      .get('/api/v1/items-interactions/items?interactionInclude=star&interactionIgnore=forced-done&limit=10&skip=-1')

    expect(res.statusCode).toEqual(422)
    expect(res.body.errors.length).toBeGreaterThan(0)
  })

  test('apiGetInteractedItems_when_notIntSkip_should_returnValidationError', async () => {
    const res = await request
      .get('/api/v1/items-interactions/items?interactionInclude=star&interactionIgnore=forced-done&limit=1.5&skip=-1')

    expect(res.statusCode).toEqual(422)
    expect(res.body.errors.length).toBeGreaterThan(0)
  })

  test('apiGetInteractedItems_when_notNumberSkip_should_returnValidationError', async () => {
    const res = await request
      .get('/api/v1/items-interactions/items?interactionInclude=star&interactionIgnore=forced-done&limit=five&skip=-1')

    expect(res.statusCode).toEqual(422)
    expect(res.body.errors.length).toBeGreaterThan(0)
  })
})
