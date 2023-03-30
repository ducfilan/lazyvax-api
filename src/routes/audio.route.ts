import { Router } from 'express'
import AudioController from '@controllers/audio.controller'
import auth from '@middlewares/global/auth.mw'

const router = Router()

router.route('/pronounce').get(auth, AudioController.apiGetPronounce)

export default router
