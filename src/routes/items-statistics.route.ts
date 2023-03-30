import { Router } from 'express'
import ItemsStatisticsController from '@controllers/items-statistics.controller'
import auth from '@middlewares/global/auth.mw'
import { validateApiGetStatistics } from '@validators/items-statistics.validator'

const securedItemsStatisticsRouter = Router()

securedItemsStatisticsRouter.route('').get(auth, validateApiGetStatistics, ItemsStatisticsController.apiGetStatistics)

export { securedItemsStatisticsRouter }