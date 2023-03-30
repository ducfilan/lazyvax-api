import { check, validationResult } from 'express-validator'
import { AscOrder, DescOrder, MaxPaginationLimit } from '@common/consts'

export const validateApiGetInteractedItems = [
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
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() })

    next()
  },
]

export const validateApiGetTopInteractItem = [
  check('limit')
    .not()
    .isEmpty()
    .bail()
    .isInt({ min: 1, max: MaxPaginationLimit })
    .withMessage(`limit should be positive and less than or equal ${MaxPaginationLimit}!`)
    .bail()
    .toInt(),
  check('order')
    .not()
    .isEmpty()
    .bail()
    .isString()
    .trim()
    .isIn([AscOrder, DescOrder])
    .withMessage(`order should be ${AscOrder} or ${DescOrder}!`)
    .bail(),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() })

    next()
  },
]
