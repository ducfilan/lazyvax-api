import { Router } from 'express'
import GoalsController from '@/controllers/goals.controller'
import multer from 'multer'
import auth from '@middlewares/global/auth.mw'
import { validateGoalCreation, validateGoalUpdate, validateGoalFilters } from '@/validators/goals.validator'

const securedGoalRouter = Router()

const upload = multer()

securedGoalRouter.route('/')
  .post(auth, upload.none(), validateGoalCreation, GoalsController.createGoal)

securedGoalRouter.route('/')
  .get(auth, validateGoalFilters, GoalsController.getGoals)

securedGoalRouter.route('/:objectiveId')
  .patch(auth, upload.none(), validateGoalUpdate, GoalsController.updateGoal)

securedGoalRouter.route('/:objectiveId')
  .delete(auth, GoalsController.deleteGoal)

securedGoalRouter.route('/:objectiveId')
  .get(auth, GoalsController.getGoalById)

securedGoalRouter.route('/goal-setting-level')
  .post(auth, upload.none(), GoalsController.getGoalSettingLevel)

export {
  securedGoalRouter
}
