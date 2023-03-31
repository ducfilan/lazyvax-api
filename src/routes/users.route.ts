import { Router } from 'express'
import UsersController from '@controllers/users.controller'
import multer from 'multer'
import auth from '@middlewares/global/auth.mw'
import { validateApiDeleteCache, validateApiGetUserRandomSet, validateApiGetUserSets, validateApiUpdateUser } from '@validators/users.validator'

const publicUserRouter = Router()
const securedUserRouter = Router()

const upload = multer()

publicUserRouter.route('/').post(upload.none(), UsersController.register)

securedUserRouter.route('/me').patch(auth, upload.none(), validateApiUpdateUser, UsersController.update)

securedUserRouter.route('/me').get(auth, UsersController.me)
securedUserRouter.route('/:userId').get(UsersController.getUserInfo)
securedUserRouter.route('/logout').post(auth, UsersController.logout)

securedUserRouter.route('/cache').delete(auth, validateApiDeleteCache, UsersController.apiDeleteCache)

export {
  publicUserRouter,
  securedUserRouter
}
