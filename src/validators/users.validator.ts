import { CacheTypes, MaxInt, MaxPaginationLimit, MaxRegistrationsStep, SupportingLanguages, SupportingPagesLength } from '@common/consts'
import { check, validationResult } from 'express-validator'
import { isEmpty } from '@common/utils/objectUtils'
import { ObjectId } from 'mongodb'

export const validateApiGetUserSets = [
  check('interaction')
    .notEmpty()
    .bail(),
  check('limit')
    .not()
    .isEmpty()
    .bail()
    .isInt({ min: 1, max: MaxPaginationLimit })
    .withMessage(`limit should be positive and less than or equal ${MaxPaginationLimit}!`)
    .bail()
    .toInt(),
  check('skip')
    .not()
    .isEmpty()
    .bail()
    .isInt({ min: 0 })
    .withMessage(`skip should be positive!`)
    .bail()
    .toInt(),
  check('userId').customSanitizer(userId => new ObjectId(userId)),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const { msg, param } = errors.array({ onlyFirstError: true })[0]
      return res.status(422).json({ error: `${param} - ${msg}` })
    }

    next()
  },
]

export const apiUpdateUserValidator = ({ langCodes, pages, finishedRegisterStep }) => {
  if (finishedRegisterStep) {
    finishedRegisterStep = Number(finishedRegisterStep)

    if (!Number.isInteger(finishedRegisterStep) || finishedRegisterStep < 0 || finishedRegisterStep > MaxRegistrationsStep) {
      throw new Error('invalid finishedRegisterStep')
    }
  }

  const updateProperties = { langCodes, pages, finishedRegisterStep }

  if (!langCodes || !Array.isArray(langCodes) || langCodes.length === 0) delete updateProperties.langCodes
  if (!pages || !Array.isArray(pages) || pages.length === 0) delete updateProperties.pages
  if (!finishedRegisterStep) delete updateProperties.finishedRegisterStep

  return updateProperties
}

export const validateApiUpdateUser = [
  check('finishedRegisterStep')
    .optional({ checkFalsy: true })
    .isInt({ min: 0, max: MaxRegistrationsStep })
    .withMessage(`should be positive and less than or equal ${MaxRegistrationsStep}!`)
    .bail()
    .toInt(),
  check('langCodes')
    .optional({ nullable: true, checkFalsy: true })
    .isArray()
    .isIn(SupportingLanguages)
    .bail(),
  check('pages')
    .optional({ nullable: true, checkFalsy: true })
    .isArray({ max: SupportingPagesLength })
    .bail()
    .withMessage(`too many pages, supporting ${SupportingPagesLength}`)
    .bail(),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const { msg, param } = errors.array({ onlyFirstError: true })[0]
      return res.status(422).json({ error: `${param} - ${msg}` })
    }

    const { langCodes, pages, finishedRegisterStep } = req.body
    let updateProperties = { langCodes, pages, finishedRegisterStep }

    if (!langCodes || !Array.isArray(langCodes) || langCodes.length === 0) delete updateProperties.langCodes
    if (!pages || !Array.isArray(pages) || pages.length === 0) delete updateProperties.pages
    if (!finishedRegisterStep) delete updateProperties.finishedRegisterStep

    if (isEmpty(updateProperties))
      return res.status(422).json({ error: 'required one of finishedRegisterStep/langCodes/pages is not provided' })

    req.body.updateProperties = updateProperties

    next()
  },
]

export const validateApiGetUserRandomSet = [
  check('itemsLimit')
    .not()
    .isEmpty()
    .bail()
    .isInt({ min: 1, max: MaxInt })
    .withMessage(`limit should be positive and less than or equal ${MaxInt}!`)
    .bail()
    .toInt(),
  check('itemsSkip')
    .not()
    .isEmpty()
    .bail()
    .isInt({ min: 0 })
    .withMessage(`skip should be positive!`)
    .bail()
    .toInt(),
  check('interaction')
    .customSanitizer(interactions => interactions.split(',')),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() })

    req.query.interactions = req.query.interaction
    next()
  },
]

export const validateApiDeleteCache = [
  check('cacheType')
    .notEmpty()
    .withMessage(`should not be empty!`)
    .bail()
    .isIn(CacheTypes)
    .withMessage(`invalid value!`)
    .bail(),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const { msg, param } = errors.array({ onlyFirstError: true })[0]
      return res.status(422).json({ error: `${param} - ${msg}` })
    }

    next()
  },
]