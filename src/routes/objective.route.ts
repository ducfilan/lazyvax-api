import { Router } from 'express'
import ObjectivesController from '@controllers/objectives.controller'
import multer from 'multer'
import auth from '@middlewares/global/auth.mw'
import { validateObjectiveCreation, validateObjectiveUpdate, validateObjectiveFilters } from '@validators/objectives.validator'

const securedObjectiveRouter = Router()

const upload = multer()

// Route for creating a new objective
securedObjectiveRouter.route('/')
  .post(auth, upload.none(), validateObjectiveCreation, ObjectivesController.createObjective)

// Route for getting objectives with multiple filters
securedObjectiveRouter.route('/')
  .get(auth, validateObjectiveFilters, ObjectivesController.getObjectives)

// Route for updating an objective by its ID
securedObjectiveRouter.route('/:objectiveId')
  .patch(auth, upload.none(), validateObjectiveUpdate, ObjectivesController.updateObjective)

// Route for deleting an objective by its ID
securedObjectiveRouter.route('/:objectiveId')
  .delete(auth, ObjectivesController.deleteObjective)

// Route for getting an objective by its ID
securedObjectiveRouter.route('/:objectiveId')
  .get(auth, ObjectivesController.getObjectiveById)

export {
  securedObjectiveRouter
}
