import { MaxInt, MaxPaginationLimit } from "@/common/consts"
import { check, validationResult } from "express-validator"
import { ObjectId } from "mongodb"

export const validateApiGetMessages = [
  check('skip')
    .not()
    .isEmpty()
    .bail()
    .isInt({ min: 0, max: MaxInt })
    .withMessage(`skip should be positive and less than or equal ${MaxInt}!`)
    .bail()
    .toInt(),
  check('limit')
    .not()
    .isEmpty()
    .bail()
    .isInt({ min: 1, max: MaxPaginationLimit })
    .withMessage(`limit should be positive and less than or equal ${MaxPaginationLimit}!`)
    .bail()
    .toInt(),
  check('conversationId')
    .customSanitizer(id => new ObjectId(id)),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() })

    next()
  },
]