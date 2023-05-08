import { MaxInt, MaxPaginationLimit } from "@/common/consts"
import { isParticipantInConversation } from "@/services/api/conversations.services"
import { check, validationResult } from "express-validator"
import { ObjectId } from "mongodb"

export const validateApiGetConversation = [
  check('conversationId')
    .customSanitizer(id => new ObjectId(id))
    .custom(async (conversationId, { req }) => {
      const userId = req.user._id
      if (!isParticipantInConversation(userId, conversationId)) {
        throw new Error('You are not part of this conversation')
      }
    }),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() })

    next()
  },
]

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
    .customSanitizer(id => new ObjectId(id))
    .custom(async (conversationId, { req }) => {
      const userId = req.user._id
      if (!isParticipantInConversation(userId, conversationId)) {
        throw new Error('You are not part of this conversation')
      }
    }),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() })

    next()
  },
]