import { Router } from 'express'
import PlanningController from '@controllers/planning.controller'
import auth from '@middlewares/global/auth.mw'
import { validateApiGetDaySuggestions } from '@/validators/planning.validator'

const securedPlanningRouter = Router()

securedPlanningRouter.route('/day-suggestions').get(auth, validateApiGetDaySuggestions, PlanningController.getDaySuggestions)

export {
  securedPlanningRouter
}
