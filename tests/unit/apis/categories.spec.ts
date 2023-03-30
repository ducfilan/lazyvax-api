import { jest, describe, test, expect, beforeAll, afterAll, afterEach } from '@jest/globals'
import { MongoClient, ObjectId } from 'mongodb'

import supertest from 'supertest'
import app from '../../../src/app'
import { injectTables } from '../../../src/common/configs/mongodb-client.config'
import { DefaultLangCode, InteractionLike, InteractionSubscribe, SupportingTopSetsTypes } from '../../../src/common/consts'
import { genNumbersArray } from '../../../src/common/utils/arrayUtils'
import { resetDb } from '../../config/helpers'
import { addInteraction } from '../../repo/interactions'
import { addSet } from '../../repo/sets'
import { addTopSet } from '../../repo/topSets'
import { mockUserFinishedSetup } from '../../repo/users'

let mongodbClient: MongoClient
let request: supertest.SuperTest<supertest.Test>

jest.mock('../../../src/middlewares/global/auth.mw', () => jest.fn(async (req, res, next) => {
  req.user = mockUserFinishedSetup

  next()
}))

jest.mock('../../../src/middlewares/global/identity.mw', () => jest.fn(async (req, res, next) => {
  req.user = mockUserFinishedSetup

  next()
}))

describe('Categories APIs test', () => {
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

  test('apiGetCategories_when_noLang_should_return_Error', async () => {
    const res = await request
      .get('/api/v1/categories?lang=')

    expect(res.statusCode).toEqual(422)
    expect(res.body.error).toEqual("lang - Invalid value")
  })

  test('apiGetCategories_when_isTopCategoryNotBoolean_should_return_Error', async () => {
    const res = await request
      .get('/api/v1/categories?lang=en&isTopCategory=xx')

    expect(res.statusCode).toEqual(422)
    expect(res.body.error).toEqual("isTopCategory - should be boolean")
  })

  test('apiGetCategories_when_notSupportedLang_should_fallbackToDefaultLang', async () => {
    const res = await request
      .get('/api/v1/categories?lang=xx')

    expect(res.statusCode).toEqual(200)
    expect(res.body.map(c => c.name[DefaultLangCode])).toBeDefined()
  })

  test('apiGetCategories_when_isTopCategoryNotSpecified_should_returnAllCategories', async () => {
    const res = await request
      .get('/api/v1/categories?lang=en')

    expect(res.statusCode).toEqual(200)
    expect(res.body.map(c => !c.isTopCategory).length).toBeGreaterThan(0)
  })

  test('apiGetCategories_when_isTopCategory_should_returnOnlyTopCategories', async () => {
    const res = await request
      .get('/api/v1/categories?lang=en&isTopCategory=true')

    expect(res.statusCode).toEqual(200)
    expect(res.body.map(c => c.isTopCategory)).toHaveLength(res.body.length)
  })

  test('apiGetTopSetsInCategories_when_noLang_should_return_Error', async () => {
    const res = await request
      .get('/api/v1/categories/6197093dfaf522d08fa52777/top-sets?lang=')

    expect(res.statusCode).toEqual(422)
    expect(res.body.error).toEqual("lang - Invalid value")
  })

  test('apiGetTopSetsInCategories_when_haveTopSetsNoInteraction_should_return_topSetsWithoutInteractions', async () => {
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

    const topSet = {
      sets: [
        {
          setId: setId,
          lastUpdated: new Date()
        }
      ],
      langCode: "en",
      categoryId,
      type: SupportingTopSetsTypes.Category
    }
    await addTopSet(mongodbClient, topSet)

    const res = await request
      .get(`/api/v1/categories/6197093dfaf522d08fa52777/top-sets?lang=en`)

    expect(res.statusCode).toEqual(200)
    expect(res.body.topSets).toHaveLength(1)
    expect(res.body.topSets[0]._id.toString()).toEqual(setId.toString())
    expect(res.body.interactions).toHaveLength(0)
  })

  test('apiGetTopSetsInCategories_when_haveTopSetsWithInteraction_should_return_topSetsWithInteractions', async () => {
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

    const topSet = {
      sets: [
        {
          setId,
          lastUpdated: new Date()
        }
      ],
      langCode: "en",
      categoryId,
      type: SupportingTopSetsTypes.Category
    }
    await addTopSet(mongodbClient, topSet)

    const actions = [InteractionSubscribe, InteractionLike]
    await addInteraction(mongodbClient, setId, mockUserFinishedSetup._id, actions)

    const res = await request
      .get(`/api/v1/categories/6197093dfaf522d08fa52777/top-sets?lang=en`)

    expect(res.statusCode).toEqual(200)
    expect(res.body.topSets).toHaveLength(1)
    expect(res.body.topSets[0]._id.toString()).toEqual(setId.toString())
    expect(res.body.interactions).toHaveLength(1)
    expect(res.body.interactions[0].actions).toEqual(actions)
  })
})
