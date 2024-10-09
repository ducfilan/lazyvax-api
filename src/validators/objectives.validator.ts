import { check, validationResult } from 'express-validator'
import { isEmpty } from '@common/utils/objectUtils'
import { ObjectiveTypes } from '@/common/consts'

// Validator for creating an objective
export const validateObjectiveCreation = [
  check('title')
    .notEmpty()
    .withMessage('Title is required')
    .bail()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters long'),
  check('detail')
    .optional()
    .isLength({ max: 50000 })
    .withMessage('Detail must be less than 50,000 characters long'),
  check('type')
    .notEmpty()
    .withMessage('Type is required')
    .bail()
    .isIn(ObjectiveTypes)
    .withMessage('Invalid type'),
  check('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  check('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((endDate, { req }) => {
      if (req.body.startDate && new Date(endDate) < new Date(req.body.startDate)) {
        throw new Error('End date must be after the start date')
      }
      return true
    }),
  check('alignTargets')
    .optional()
    .isArray()
    .withMessage('Align targets must be an array'),
  check('alignTargets.*')
    .isMongoId()
    .withMessage('Align targets must contain valid IDs'),
  check('areas')
    .optional()
    .isArray()
    .withMessage('Areas must be an array'),
  check('areas.*')
    .isMongoId()
    .withMessage('Areas must contain valid IDs'),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const { msg, param } = errors.array({ onlyFirstError: true })[0]
      return res.status(422).json({ error: `${param} - ${msg}` })
    }

    next()
  },
]

// Validator for updating an objective
export const validateObjectiveUpdate = [
  check('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters long'),
  check('detail')
    .optional()
    .isLength({ max: 50000 })
    .withMessage('Detail must be less than 50,000 characters long'),
  check('type')
    .optional()
    .isIn(ObjectiveTypes)
    .withMessage('Invalid type'),
  check('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  check('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((endDate, { req }) => {
      if (req.body.startDate && new Date(endDate) < new Date(req.body.startDate)) {
        throw new Error('End date must be after the start date')
      }
      return true
    }),
  check('alignTargets')
    .optional()
    .isArray()
    .withMessage('Align targets must be an array'),
  check('alignTargets.*')
    .isMongoId()
    .withMessage('Align targets must contain valid IDs'),
  check('areas')
    .optional()
    .isArray()
    .withMessage('Areas must be an array'),
  check('areas.*')
    .isMongoId()
    .withMessage('Areas must contain valid IDs'),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const { msg, param } = errors.array({ onlyFirstError: true })[0]
      return res.status(422).json({ error: `${param} - ${msg}` })
    }

    if (isEmpty(req.body)) {
      return res.status(422).json({ error: 'At least one field is required for updating' })
    }

    next()
  },
]

// Validator for filtering objectives
export const validateObjectiveFilters = [
  check('type')
    .optional()
    .isIn(ObjectiveTypes)
    .withMessage('Invalid type'),
  check('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  check('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((endDate, { req }) => {
      if (req.query.startDate && new Date(endDate) < new Date(req.query.startDate)) {
        throw new Error('End date must be after the start date')
      }
      return true
    }),
  check('areaId')
    .optional()
    .isMongoId()
    .withMessage('Area ID must be a valid MongoDB ID'),
  check('keyword')
    .optional()
    .isString()
    .withMessage('Keyword must be a string'),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const { msg, param } = errors.array({ onlyFirstError: true })[0]
      return res.status(422).json({ error: `${param} - ${msg}` })
    }

    next()
  },
]
