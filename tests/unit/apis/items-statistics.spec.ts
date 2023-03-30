import { jest, describe, test, expect, beforeAll, afterAll, afterEach } from '@jest/globals'
import { MongoClient } from 'mongodb'

import supertest from 'supertest'
import app from '../../../src/app'
import { injectTables } from '../../../src/common/configs/mongodb-client.config'
import { resetDb } from '../../config/helpers'
import { addItemsStatistics } from '../../repo/itemsStatistics'
import { addUser, mockUserFinishedSetup } from '../../repo/users'

let mongodbClient: MongoClient
let request: supertest.SuperTest<supertest.Test>

jest.mock('../../../src/middlewares/global/auth.mw', () => jest.fn(async (req, res, next) => {
  req.user = mockUserFinishedSetup

  next()
}))

describe('Items Statistics APIs test', () => {
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

  test('apiGetStatistics_when_withEmptyBeginDate_should_return_Error', async () => {
    await addUser(mongodbClient, mockUserFinishedSetup)

    const res = await request
      .get('/api/v1/items-statistics?beginDate=&endDate=2022-10-13')

    expect(res.statusCode).toEqual(422)
    expect(res.body.errors.length).toBeGreaterThan(0)
    expect(res.body.errors[0].param).toEqual("beginDate")
  })

  test('apiGetStatistics_when_withInvalidBeginDate_should_return_Error', async () => {
    await addUser(mongodbClient, mockUserFinishedSetup)

    const res = await request
      .get('/api/v1/items-statistics?beginDate=2022-10-113&endDate=2022-10-14')

    expect(res.statusCode).toEqual(422)
    expect(res.body.errors.length).toBeGreaterThan(0)
    expect(res.body.errors[0].param).toEqual("beginDate")
    expect(res.body.errors[0].msg).toEqual("beginDate should be a date format!")
  })

  test('apiGetStatistics_when_withEmptyEndDate_should_return_Error', async () => {
    await addUser(mongodbClient, mockUserFinishedSetup)

    const res = await request
      .get('/api/v1/items-statistics?beginDate=2022-10-13&endDate=')

    expect(res.statusCode).toEqual(422)
    expect(res.body.errors.length).toBeGreaterThan(0)
    expect(res.body.errors[0].param).toEqual("endDate")
  })

  test('apiGetStatistics_when_withInvalidEndDate_should_return_Error', async () => {
    await addUser(mongodbClient, mockUserFinishedSetup)

    const res = await request
      .get('/api/v1/items-statistics?beginDate=2022-10-13&endDate=2022-10-131')

    expect(res.statusCode).toEqual(422)
    expect(res.body.errors.length).toBeGreaterThan(0)
    expect(res.body.errors[0].param).toEqual("endDate")
    expect(res.body.errors[0].msg).toEqual("endDate should be a date format!")
  })

  test('apiGetStatistics_when_correctDateRange_should_return_correctStatistics', async () => {
    await addUser(mongodbClient, mockUserFinishedSetup)
    await addItemsStatistics(mongodbClient, mockUserFinishedSetup._id, new Date("2022-10-13"), { show: 11, next: 12, gotIt: 13, ignore: 14, correct: 15, incorrect: 16, star: 17 })
    await addItemsStatistics(mongodbClient, mockUserFinishedSetup._id, new Date("2022-10-14"), { show: 21, next: 22, gotIt: 23, ignore: 24, correct: 25, incorrect: 26, star: 27 })
    await addItemsStatistics(mongodbClient, mockUserFinishedSetup._id, new Date("2022-10-15"), { show: 31, next: 32, gotIt: 33, ignore: 34, correct: 35, incorrect: 36, star: 37 })
    await addItemsStatistics(mongodbClient, mockUserFinishedSetup._id, new Date("2022-10-16"), { show: 41, next: 42, gotIt: 43, ignore: 44, correct: 45, incorrect: 46, star: 47 })

    const res = await request
      .get('/api/v1/items-statistics?beginDate=2022-10-14&endDate=2022-10-15')

    expect(res.statusCode).toEqual(200)
    expect(res.body).toHaveLength(2)
  })

  test('apiGetStatistics_when_correctDateRangeWithTime_should_return_correctStatistics', async () => {
    await addUser(mongodbClient, mockUserFinishedSetup)
    await addItemsStatistics(mongodbClient, mockUserFinishedSetup._id, new Date("2022-10-13"), { show: 11, next: 12, gotIt: 13, ignore: 14, correct: 15, incorrect: 16, star: 17 })
    await addItemsStatistics(mongodbClient, mockUserFinishedSetup._id, new Date("2022-10-14"), { show: 21, next: 22, gotIt: 23, ignore: 24, correct: 25, incorrect: 26, star: 27 })
    await addItemsStatistics(mongodbClient, mockUserFinishedSetup._id, new Date("2022-10-15"), { show: 31, next: 32, gotIt: 33, ignore: 34, correct: 35, incorrect: 36, star: 37 })
    await addItemsStatistics(mongodbClient, mockUserFinishedSetup._id, new Date("2022-10-16"), { show: 41, next: 42, gotIt: 43, ignore: 44, correct: 45, incorrect: 46, star: 47 })

    const res = await request
      .get('/api/v1/items-statistics?beginDate=2022-10-14 23:59:59&endDate=2022-10-15 23:59:59')

    expect(res.statusCode).toEqual(200)
    expect(res.body).toHaveLength(2)
  })
})
