import { Router } from 'express'
import ItemsInteractionsController from '@controllers/items-interactions.controller'
import auth from '@middlewares/global/auth.mw'
import { validateApiGetInteractedItems, validateApiGetTopInteractItem } from '@validators/items-interactions.validator'

const securedItemsInteractionsRouter = Router()

securedItemsInteractionsRouter.route('/:setId/items-interactions/:itemId').post(auth, ItemsInteractionsController.apiInteractItem)
securedItemsInteractionsRouter.route('/:setId/item-interactions').get(auth, validateApiGetTopInteractItem, ItemsInteractionsController.apiGetTopInteractItem)
securedItemsInteractionsRouter.route('/items').get(auth, validateApiGetInteractedItems, ItemsInteractionsController.apiGetInteractedItems)
securedItemsInteractionsRouter.route('/count').get(auth, ItemsInteractionsController.apiCountInteractedItems)

export { securedItemsInteractionsRouter }