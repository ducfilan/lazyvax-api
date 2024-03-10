import { AgeGroups, CacheTypes, GoalMaxLength, MaxRegistrationsStep, SupportingLanguages } from '@common/consts'
import { check, validationResult } from 'express-validator'
import { isEmpty } from '@common/utils/objectUtils'

export const validateApiUpdateUser = [
  check('finishedRegisterStep')
    .optional({ checkFalsy: true })
    .isInt({ min: 0, max: MaxRegistrationsStep })
    .withMessage(`should be positive and less than or equal ${MaxRegistrationsStep}!`)
    .bail()
    .toInt(),
  check('locale')
    .optional()
    .isIn(SupportingLanguages)
    .bail(),
  check('preferences.age')
    .optional()
    .isString()
    .isIn(AgeGroups)
    .bail(),
  check('preferences.occupation')
    .optional()
    .isString()
    .isLength({ min: 0, max: 100 })
    .bail(),
  check('preferences.futureSelf')
    .optional({ nullable: true, checkFalsy: true })
    .isArray()
    .bail(),
  check('preferences.futureSelf.*')
    .isString()
    .custom(value => {
      if (value.length > GoalMaxLength) {
        throw new Error('Goal must be less than 250 characters long')
      }
      return true
    })
    .bail(),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const { msg, param } = errors.array({ onlyFirstError: true })[0]
      return res.status(422).json({ error: `${param} - ${msg}` })
    }

    const { finishedRegisterStep, locale, preferences } = req.body
    let updateProperties = { finishedRegisterStep, locale, preferences }

    if (!locale || locale.length === 0) delete updateProperties.locale
    if (!preferences || Object.keys(preferences).length === 0) delete updateProperties.preferences
    if (!finishedRegisterStep) delete updateProperties.finishedRegisterStep

    if (isEmpty(updateProperties))
      return res.status(422).json({ error: 'required one of finishedRegisterStep, locale, preferences is not provided' })

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