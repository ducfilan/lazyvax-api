import {
  Router
} from 'express'
import CategoriesController from '@controllers/categories.controller'
import SetsController from '@controllers/sets.controller'
import identity from '@middlewares/global/identity.mw'
import { validateApiGetCategories, validateApiGetTopSetsInCategories } from '@validators/categories.validator'

const router = Router()

router.route('/').get(validateApiGetCategories, CategoriesController.apiGetCategories)
router.route('/:categoryId/sets').get(identity, SetsController.apiGetSetsInCategories)
router.route('/:categoryId/top-sets').get(validateApiGetTopSetsInCategories, identity, SetsController.apiGetTopSetsInCategories)

export default router
