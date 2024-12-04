import { PlanQuestionAnswerOptionMaxLength, PlanQuestionMaxLength, TodoTaskTitleMaxLength } from '@/common/consts/constants';
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
    .custom((extraInfo) => {
      if (extraInfo?.dayActivitiesToArrange !== undefined) {
        if (!Array.isArray(extraInfo.dayActivitiesToArrange)) {
          throw new Error('dayActivitiesToArrange must be an array')
        }
        if (extraInfo?.isQuestionsAnswered !== undefined && typeof extraInfo.isQuestionsAnswered !== 'boolean') {
          throw new Error('isQuestionsAnswered must be a boolean')
        }

        if (extraInfo?.questions !== undefined) {
          if (!Array.isArray(extraInfo.questions)) {
            throw new Error('questions must be an array')
          }

          if (!extraInfo.questions.every(q => {
            if (typeof q !== 'object' || q === null) return false
            if (typeof q.question !== 'string' || q.question.length === 0 || q.question.length > PlanQuestionMaxLength) return false

            if (q.selectedAnswer !== undefined) {
              if (typeof q.selectedAnswer !== 'string' ||
                q.selectedAnswer.length === 0 ||
                q.selectedAnswer.length > PlanQuestionAnswerOptionMaxLength) return false
            }

            if (q.answerOptions !== undefined) {
              if (!Array.isArray(q.answerOptions)) return false
              if (!q.answerOptions.every(opt =>
                typeof opt === 'string' &&
                opt.length > 0 &&
                opt.length <= PlanQuestionAnswerOptionMaxLength
              )) return false
            }

            return true
          })) {
            throw new Error(`Invalid questions format. Each question must have a string question field (max ${PlanQuestionMaxLength} chars) and optional selectedAnswer/answerOptions (max ${PlanQuestionAnswerOptionMaxLength} chars each)`)
          }
        }

        if (!extraInfo.dayActivitiesToArrange.every(item =>
          typeof item === 'string' &&
          item.length > 0 &&
          item.length <= TodoTaskTitleMaxLength
        )) {
          throw new Error(`each item in dayActivitiesToArrange must be a string with max length of ${TodoTaskTitleMaxLength} characters`)
        }
      }
      return true
    })
    .customSanitizer((extraInfo: any) => {
      const {
        weekToDoTasksConfirmed,
        forcedToPlanLate,
        dayActivitiesConfirmed,
        dayActivitiesToArrange,
        questions,
        isQuestionsAnswered,
      } = extraInfo

      const finalExtraInfo = {
        weekToDoTasksConfirmed,
        forcedToPlanLate,
        dayActivitiesConfirmed,
        dayActivitiesToArrange,
        questions,
        isQuestionsAnswered,
      }

      return Object.fromEntries(
        Object.entries(finalExtraInfo).filter(([_, value]) => value !== undefined)
      )
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
