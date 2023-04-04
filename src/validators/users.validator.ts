import { CacheTypes, MaxRegistrationsStep, SupportingLanguages, SupportingPagesLength } from '@common/consts'
import { check, validationResult } from 'express-validator'
import { isEmpty } from '@common/utils/objectUtils'

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