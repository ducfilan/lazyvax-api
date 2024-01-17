import { isParticipantInConversation } from "@/services/api/conversations.services"
import { check, validationResult } from "express-validator"
import { ObjectId } from "mongodb"

export const validateApiGetActionCompletion = [
  check('conversationId')
    .customSanitizer(id => new ObjectId(id))
    .custom(async (conversationId, { req }) => {
      const userId = req.user._id
      const inConversation = await isParticipantInConversation(userId, conversationId)
      if (!inConversation) {
        throw new Error('You are not part of this conversation')
      }
    }),
  check('milestoneId')
    .customSanitizer(id => new ObjectId(id)),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() })

    next()
  },
]