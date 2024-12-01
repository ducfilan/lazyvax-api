import { check, validationResult } from 'express-validator';
import { ObjectId } from 'mongodb';

export const validateApiRunDaySuggestions = [
  check('date').isISO8601().withMessage('Date must be a valid ISO 8601 date.')
    .customSanitizer(date => new Date(date)),
  check('conversationId').isMongoId().withMessage('Conversation ID must be a valid MongoDB ObjectId.')
    .customSanitizer((id: string) => new ObjectId(id)),
  check('extraInfo')
    .optional()
    .isObject()
    .withMessage('Extra info must be an object')
    .customSanitizer((extraInfo: any) => {
      const {
        weekToDoTasksConfirmed,
        forcedToPlanLate,
        dayActivitiesConfirmed,
        dayActivitiesToArrange,
      } = extraInfo

      return {
        weekToDoTasksConfirmed,
        forcedToPlanLate,
        dayActivitiesConfirmed,
        dayActivitiesToArrange,
      }
    }),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const error = errors.array({ onlyFirstError: true })[0]
      return res.status(422).json({ error: error.msg })
    }
    next()
  },
];
