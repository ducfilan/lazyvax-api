import { Router } from 'express'
import PlanningController from '@controllers/planning.controller'
import auth from '@middlewares/global/auth.mw'
import { validateApiRunDaySuggestions } from '@/validators/planning.validator'

const securedPlanningRouter = Router()

securedPlanningRouter.route('/day-suggestions/:conversationId').post(auth, validateApiRunDaySuggestions, PlanningController.runDaySuggestions)

export {
  securedPlanningRouter
}
