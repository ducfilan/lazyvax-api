import { Router } from 'express'
import ObjectivesController from '@controllers/objectives.controller'
import multer from 'multer'
import auth from '@middlewares/global/auth.mw'
import { validateObjectiveCreation, validateObjectiveUpdate, validateObjectiveFilters } from '@validators/objectives.validator'

const securedObjectiveRouter = Router()

const upload = multer()

securedObjectiveRouter.route('/')
  .post(auth, upload.none(), validateObjectiveCreation, ObjectivesController.createObjective)

securedObjectiveRouter.route('/')
  .get(auth, validateObjectiveFilters, ObjectivesController.getObjectives)

securedObjectiveRouter.route('/:objectiveId')
  .patch(auth, upload.none(), validateObjectiveUpdate, ObjectivesController.updateObjective)

securedObjectiveRouter.route('/:objectiveId')
  .delete(auth, ObjectivesController.deleteObjective)

securedObjectiveRouter.route('/:objectiveId')
  .get(auth, ObjectivesController.getObjectiveById)

export {
  securedObjectiveRouter
}
