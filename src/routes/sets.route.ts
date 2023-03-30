import { Router } from 'express'
import SetsController from '@controllers/sets.controller'
import multer from 'multer'
import auth from '@middlewares/global/auth.mw'
import recaptcha from '@middlewares/global/recaptcha.mw'
import identity from '@middlewares/global/identity.mw'

const publicSetsRouter = Router()
const securedSetsRouter = Router()

const upload = multer()

securedSetsRouter.route('/').post(auth, recaptcha, upload.none(), SetsController.apiCreateSet)
securedSetsRouter.route('/').patch(auth, recaptcha, upload.none(), SetsController.apiEditSet)
publicSetsRouter.route('/:setId').get(identity, SetsController.apiGetSet) // TODO: Add Authorization
publicSetsRouter.route('/').get(identity, SetsController.apiSearchSet)

export { securedSetsRouter, publicSetsRouter }
