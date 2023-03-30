import {
  Router
} from 'express'
import TokenController from '@controllers/token.controller'

const router = Router()

router.route('/').get(TokenController.apiGetTokenFromCode)
router.route('/refresh').get(TokenController.refreshAccessToken)
router.route('/oauth2callback').get(TokenController.oauth2callback)

export default router
