import { check, validationResult } from "express-validator"
import { ObjectId } from "mongodb"
import { DefaultLangCode, SupportingUiLanguages } from "../common/consts"

export const validateApiGetCategories = [
  check('lang')
    .not()
    .isEmpty()
    .bail(),
  check('isTopCategory')
    .optional()
    .bail()
    .isBoolean()
    .withMessage(`should be boolean`)
    .bail()
    .toBoolean(),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const { msg, param } = errors.array({ onlyFirstError: true })[0]
      return res.status(422).json({ error: `${param} - ${msg}` })
    }

    if (!SupportingUiLanguages.includes(req.lang)) {
      req.lang = DefaultLangCode
    }

    if (!req.isTopCategory) req.isTopCategory = false

    next()
  },
]

export const validateApiGetTopSetsInCategories = [
  check('lang')
    .not()
    .isEmpty()
    .bail(),
  check('categoryId')
    .customSanitizer(id => new ObjectId(id)),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const { msg, param } = errors.array({ onlyFirstError: true })[0]
      return res.status(422).json({ error: `${param} - ${msg}` })
    }

    next()
  },
]
