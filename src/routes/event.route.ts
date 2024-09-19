import { Router } from 'express'
import auth from '@middlewares/global/auth.mw'
import EventController from '@/controllers/event.controller'

const securedEventRouter = Router()

securedEventRouter.route('/').get(auth, EventController.getEvents)

export {
  securedEventRouter
}
