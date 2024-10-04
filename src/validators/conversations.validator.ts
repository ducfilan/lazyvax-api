import { ConversationTypes, MaxInt, MaxPaginationLimit } from "@/common/consts"
import { isEmpty } from "@/common/utils/objectUtils"
import { isParticipantInConversation } from "@/services/api/conversations.services"
import { check, validationResult } from "express-validator"
import { ObjectId } from "mongodb"

export const validateApiGetConversationById = [
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

export const validateApiGetConversationByType = [
  check('meta')
    .customSanitizer(meta => JSON.parse(decodeURIComponent(meta))),
  check('type')
    .isIn(ConversationTypes),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() })

    next()
  },
]

export const validateApiUpdateConversation = [
  check('conversationId')
    .customSanitizer(id => new ObjectId(id))
    .custom(async (conversationId, { req }) => {
      const userId = req.user._id
      if (!isParticipantInConversation(userId, conversationId)) {
        throw new Error('You are not part of this conversation')
      }
    }),
  check('title')
    .optional()
    .isString()
    .isLength({ min: 0, max: 255 })
    .bail(),
  check('description')
    .optional()
    .isString()
    .bail(),
  check('notes')
    .optional()
    .isString()
    .bail(),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const { msg, param } = errors.array({ onlyFirstError: true })[0]
      return res.status(422).json({ error: `${param} - ${msg}` })
    }

    const { title, description, notes } = req.body
    let updateProperties = { title, description, notes }

    if (!title || title.length === 0) delete updateProperties.title
    if (!description || description.length === 0) delete updateProperties.description
    if (!notes || notes.length === 0) delete updateProperties.notes

    if (isEmpty(updateProperties))
      return res.status(422).json({ error: 'required one of finishedRegisterStep, locale, preferences is not provided' })

    req.body.updateProperties = updateProperties

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