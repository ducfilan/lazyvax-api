import { Router } from 'express'
import ImagesController from '@controllers/images.controller'
import multer from 'multer'
import auth from '@middlewares/global/auth.mw'

const router = Router()

const upload = multer()

router.route('/pre-signed-url').post(auth, upload.none(), ImagesController.apiGetPreSignedUrl)

export default router
