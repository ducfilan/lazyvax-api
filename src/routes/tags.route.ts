import { Router } from 'express'
import TagsController from '@controllers/tags.controller'
import multer from 'multer'
import auth from '@middlewares/global/auth.mw'

const router = Router()

const upload = multer()

router.route('/').post(auth, upload.none(), TagsController.apiCreateTag)
router.route('/:start_with').get(auth, upload.none(), TagsController.apiGetTagsStartWith)

export default router
