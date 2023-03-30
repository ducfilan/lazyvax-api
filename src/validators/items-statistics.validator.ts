import { removeTimeInfo } from '@common/utils/stringUtils'
import { check, validationResult } from 'express-validator'

export const validateApiGetStatistics = [
  check('beginDate')
    .not()
    .isEmpty()
    .bail()
    .isISO8601()
    .withMessage('beginDate should be a date format!')
    .bail()
    .toDate()
    .customSanitizer((value, { req }) => {
      return removeTimeInfo(value)
    }),
  check('endDate')
    .not()
    .isEmpty()
    .bail()
    .isISO8601()
    .withMessage('endDate should be a date format!')
    .bail()
    .toDate()
    .customSanitizer((value, { req }) => {
      return removeTimeInfo(value)
    }),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() })

    next()
  },
]
