import { check, validationResult } from 'express-validator'
import { isEmpty } from '@common/utils/objectUtils'
import { ObjectiveTypes } from '@/common/consts/shared'

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
  check('fromDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date')
    .customSanitizer(fromDate => new Date(fromDate)),
  check('toDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
    .customSanitizer(toDate => new Date(toDate))
    .custom((toDate, { req }) => {
      if (req.body.fromDate && toDate < req.body.fromDate) {
        throw new Error('End date must be after the start date')
      }
      return true
    }),
  check('atAge')
    .optional()
    .isInt()
    .withMessage('At age must be an integer')
    .customSanitizer(atAge => parseInt(atAge)),
  check('alignObjectives')
    .optional()
    .isArray()
    .withMessage('Align targets must be an array'),
  check('alignObjectives.*')
    .isMongoId()
    .withMessage('Align targets must contain valid IDs'),
  check('alignAreas')
    .optional()
    .isArray()
    .withMessage('Areas must be an array'),
  check('alignAreas.*')
    .isLength({ max: 50 })
    .withMessage('Areas must contain valid IDs'), // TODO: validate area name.
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const error = errors.array({ onlyFirstError: true })[0]
      switch (error.type) {
        case 'field':
          return res.status(422).json({ error: `${error.path} - ${error.msg}` })
        default:
          return res.status(422).json({ error: error.msg })
      }
    }

    next()
  },
]

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
  check('fromDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  check('toDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((toDate, { req }) => {
      if (req.body.fromDate && new Date(toDate) < new Date(req.body.fromDate)) {
        throw new Error('End date must be after the start date')
      }
      return true
    }),
  check('alignObjectives')
    .optional()
    .isArray()
    .withMessage('Align targets must be an array'),
  check('alignObjectives.*')
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
      const error = errors.array({ onlyFirstError: true })[0]
      switch (error.type) {
        case 'field':
          return res.status(422).json({ error: `${error.path} - ${error.msg}` })
        default:
          return res.status(422).json({ error: error.msg })
      }
    }

    if (isEmpty(req.body)) {
      return res.status(422).json({ error: 'At least one field is required for updating' })
    }

    next()
  },
]

export const validateObjectiveFilters = [
  check('type')
    .optional()
    .isIn(ObjectiveTypes)
    .withMessage('Invalid type'),
  check('fromDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  check('toDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((toDate, { req }) => {
      if (req.query.fromDate && new Date(toDate) < new Date(req.query.fromDate)) {
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
      const error = errors.array({ onlyFirstError: true })[0]
      switch (error.type) {
        case 'field':
          return res.status(422).json({ error: `${error.path} - ${error.msg}` })
        default:
          return res.status(422).json({ error: error.msg })
      }
    }

    next()
  },
]
