import { jest, describe, test, expect, beforeAll, afterAll, afterEach } from '@jest/globals'
import { MongoClient } from 'mongodb'

import supertest from 'supertest'
import app from '../../../src/app'
import { injectTables } from '../../../src/common/configs/mongodb-client.config'
import { resetDb } from '../../config/helpers'
import { addUser, getById, mockUserFinishedSetup } from '../../repo/users'
import { MaxRegistrationsStep } from '../../../src/common/consts/constants'

let mongodbClient: MongoClient
let request: supertest.SuperTest<supertest.Test>

jest.mock('../../../src/middlewares/global/auth.mw', () => jest.fn(async (req: any, res: any, next: any) => {
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
})

// TODO: Test getUserRandomSet