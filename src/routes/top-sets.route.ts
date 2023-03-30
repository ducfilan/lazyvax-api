import { Router } from 'express'
import SetsController from '@controllers/sets.controller'
import identity from '@middlewares/global/identity.mw'

const publicTopSetRouter = Router()

publicTopSetRouter.route('/').get(identity, SetsController.apiGetTopSets)

export { publicTopSetRouter }
