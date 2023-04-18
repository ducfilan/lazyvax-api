import { Router } from 'express'
import UsersController from '@controllers/users.controller'
import multer from 'multer'
import auth from '@middlewares/global/auth.mw'
import { validateApiDeleteCache, validateApiUpdateUser } from '@validators/users.validator'

const securedMessageRouter = Router()

const upload = multer()

securedMessageRouter.route('/me').patch(auth, upload.none(), validateApiUpdateUser, UsersController.update)

securedMessageRouter.route('/me').get(auth, UsersController.me)
securedMessageRouter.route('/:userId').get(UsersController.getUserInfo)
securedMessageRouter.route('/logout').post(auth, UsersController.logout)

securedMessageRouter.route('/cache').delete(auth, validateApiDeleteCache, UsersController.apiDeleteCache)

export {
  securedMessageRouter
}
