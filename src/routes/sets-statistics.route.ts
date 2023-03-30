import { Router } from 'express'
import SetsStatisticsController from '@controllers/sets-statistics.controller'
import auth from '@middlewares/global/auth.mw'

const securedSetsStatisticsRouter = Router()

securedSetsStatisticsRouter.route('').get(auth, SetsStatisticsController.apiGetSetsStatistics)

export { securedSetsStatisticsRouter }