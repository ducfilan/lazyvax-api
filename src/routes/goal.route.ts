import { Router } from 'express'
import GoalsController from '@/controllers/goals.controller'
import multer from 'multer'
import auth from '@middlewares/global/auth.mw'
import { validateGoalCreation, validateGoalUpdate, validateGoalFilters, validateDetermineGoalSettingCategory } from '@/validators/goals.validator'

const securedGoalRouter = Router()

const upload = multer()

securedGoalRouter.route('/')
  .post(auth, upload.none(), validateGoalCreation, GoalsController.createGoal)

securedGoalRouter.route('/')
  .get(auth, validateGoalFilters, GoalsController.getGoals)

securedGoalRouter.route('/:goalId')
  .patch(auth, upload.none(), validateGoalUpdate, GoalsController.updateGoal)

securedGoalRouter.route('/:goalId')
  .delete(auth, GoalsController.deleteGoal)

securedGoalRouter.route('/category-questions')
  .get(auth, GoalsController.getGoalSettingCategoryQuestions)

securedGoalRouter.route('/category')
  .post(auth, validateDetermineGoalSettingCategory, GoalsController.determineGoalSettingCategory)

securedGoalRouter.route('/:goalId')
  .get(auth, GoalsController.getGoalById)

export {
  securedGoalRouter
}
