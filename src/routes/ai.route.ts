import { Router } from 'express'
import auth from '@middlewares/global/auth.mw'
import AiController from '@/controllers/ai.controller'
import { validateApiGetActionCompletion } from '@/validators/ai.validator'

const securedAiRouter = Router()

securedAiRouter.route('/completion/action').get(auth, validateApiGetActionCompletion, AiController.getActionCompletion)

export {
  securedAiRouter
}
