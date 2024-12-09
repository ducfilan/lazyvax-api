import { GeneralDescriptionMaxLength, MaxInt, MaxPaginationLimit, TagMaxLength, TodoTaskTitleMaxLength } from "@/common/consts/constants"
import { ConversationTypes, ConversationTypeWeek, TaskPriorities } from "@/common/consts/shared"
import { isEmpty } from "@/common/utils/objectUtils"
import { isParticipantInConversation } from "@/services/api/conversations.services"
import { check, validationResult } from "express-validator"
import { ObjectId } from "mongodb"

const checkParticipant = (userId, conversationId) => {
  if (!isParticipantInConversation(userId, conversationId)) {
    throw new Error('You are not part of this conversation')
  }

  return true
}

const validateTask = (task) => {
  if (!task.title || (task.completed !== undefined && typeof task.completed !== 'boolean')) {
    throw new Error('Each task must have title and completed fields')
  }
  if (task.title && (typeof task.title !== 'string' || task.title.length === 0 || task.title.length > TodoTaskTitleMaxLength)) {
    throw new Error(`title must be a non-empty string with max length of ${TodoTaskTitleMaxLength} characters`);
  }
  if (task.description && (typeof task.description !== 'string' || task.description.length > GeneralDescriptionMaxLength)) {
    throw new Error(`description must be a string with max length of ${GeneralDescriptionMaxLength} characters`);
  }
  if (task.priority && (!Number.isInteger(task.priority) || !TaskPriorities.includes(task.priority))) {
    throw new Error('priority must be one of valid priority values');
  }
  if (task.progress && (!Number.isInteger(task.progress) || task.progress < 0 || task.progress > 100)) {
    throw new Error('progress must be an integer between 0 and 100');
  }
  if (task.tags) {
    if (!Array.isArray(task.tags)) throw new Error('tags must be an array');
    if (!task.tags.every(tag => typeof tag === 'string' && tag.length <= TagMaxLength)) {
      throw new Error(`each tag must be a string with max length of ${TagMaxLength} characters`);
    }
  }
  if (task.dueDate && !(new Date(task.dueDate)).getTime()) {
    throw new Error('dueDate must be a valid date');
  }

  return true
}

export const validateApiGetConversationById = [
  check('conversationId')
    .customSanitizer(id => new ObjectId(id as string))
    .custom((conversationId, { req }) => checkParticipant(req?.user?._id, conversationId)),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() })

    next()
  },
]

export const validateApiGetConversationByType = [
  check('meta')
    .customSanitizer((meta, { req }) => {
      const metaObj = JSON.parse(decodeURIComponent(meta))
      const type = req.query.type
      if (type === ConversationTypeWeek) {
        metaObj.meta.startDate = new Date(metaObj.meta.startDate)
      }
      return metaObj.meta
    }),
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
    .customSanitizer(id => new ObjectId(id as string))
    .custom((conversationId, { req }) => checkParticipant(req?.user?._id, conversationId)),
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
      const error = errors.array({ onlyFirstError: true })[0]
      return res.status(422).json({ error: error.msg })
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
    .customSanitizer(id => new ObjectId(id as string))
    .custom((conversationId, { req }) => checkParticipant(req?.user?._id, conversationId)),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() })

    next()
  },
]

export const validateApiReplaceTodoTasks = [
  check('conversationId')
    .customSanitizer(id => new ObjectId(id as string))
    .custom((conversationId, { req }) => checkParticipant(req?.user?._id, conversationId)),
  check('tasks')
    .isArray()
    .bail()
    .custom((tasks) => {
      for (const task of tasks) {
        validateTask(task);
      }
      return true;
    })
    .customSanitizer(tasks => {
      return tasks.map(task => {
        const sanitizedTask = { ...task };

        sanitizedTask._id = new ObjectId();
        sanitizedTask.completed = task.completed ?? false;

        if (sanitizedTask.dueDate) {
          sanitizedTask.dueDate = new Date(sanitizedTask.dueDate);
        }

        if (sanitizedTask.tags) {
          sanitizedTask.tags = sanitizedTask.tags.map(tag => tag.trim());
        }

        return sanitizedTask;
      });
    }),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const error = errors.array({ onlyFirstError: true })[0]
      return res.status(422).json({ error: error.msg })
    }
    next()
  },
]

export const validateApiAddTodoTask = [
  check('conversationId')
    .customSanitizer(id => new ObjectId(id as string))
    .custom((conversationId, { req }) => checkParticipant(req?.user?._id, conversationId)),
  check('task')
    .isObject()
    .custom(task => validateTask(task))
    .customSanitizer(task => {
      const sanitizedTask = { ...(task || {}) };

      sanitizedTask._id = new ObjectId();
      sanitizedTask.completed = task.completed ?? false;

      if (sanitizedTask.dueDate) {
        sanitizedTask.dueDate = new Date(sanitizedTask.dueDate);
      }

      if (sanitizedTask.tags) {
        sanitizedTask.tags = sanitizedTask.tags.map(tag => tag.trim());
      }

      return sanitizedTask;
    }),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const error = errors.array({ onlyFirstError: true })[0]
      return res.status(422).json({ error: error.msg })
    }
    next()
  }
]

export const validateApiUpdateTodoTask = [
  check('conversationId')
    .customSanitizer(id => new ObjectId(id as string))
    .custom((conversationId, { req }) => checkParticipant(req?.user?._id, conversationId)),
  check('taskId')
    .customSanitizer(id => new ObjectId(id as string)),
  check('task')
    .isObject()
    .custom(task => validateTask(task))
    .customSanitizer(task => {
      const sanitizedTask = { ...task };

      sanitizedTask._id = task._id ? new ObjectId(task._id as string) : new ObjectId();
      sanitizedTask.completed = task.completed ?? false;

      if (sanitizedTask.dueDate) {
        sanitizedTask.dueDate = new Date(sanitizedTask.dueDate);
      }

      if (sanitizedTask.tags) {
        sanitizedTask.tags = sanitizedTask.tags.map(tag => tag.trim());
      }

      return sanitizedTask;
    }),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const error = errors.array({ onlyFirstError: true })[0]
      return res.status(422).json({ error: error.msg })
    }
    next()
  }
]

export const validateApiDeleteTodoTask = [
  check('conversationId')
    .customSanitizer(id => new ObjectId(id as string))
    .custom((conversationId, { req }) => checkParticipant(req?.user?._id, conversationId)),
  check('taskId')
    .customSanitizer(id => new ObjectId(id as string)),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const error = errors.array({ onlyFirstError: true })[0]
      return res.status(422).json({ error: error.msg })
    }
    next()
  }
]
