import { Router } from 'express'
import { securedUserRouter } from '@routes/users.route'
import { securedSetsRouter } from '@routes/sets.route'
import { securedInteractionsRouter } from '@routes/interactions.route'
import { securedItemsInteractionsRouter } from '@routes/items-interactions.route'
import { securedItemsStatisticsRouter } from '@routes/items-statistics.route'
import { securedSetsStatisticsRouter } from '@routes/sets-statistics.route'
import { securedMissionsRouter } from '@routes/missions.route'

import tagsRouter from '@routes/tags.route'
import imagesRouter from '@routes/images.route'
import audioRouter from '@routes/audio.route'

let securedRouter = Router()

securedRouter.use('/users', securedUserRouter)
securedRouter.use('/sets', securedSetsRouter)
securedRouter.use('/interactions', securedInteractionsRouter)
securedRouter.use('/items-interactions', securedItemsInteractionsRouter)
securedRouter.use('/items-statistics', securedItemsStatisticsRouter)
securedRouter.use('/sets-statistics', securedSetsStatisticsRouter)
securedRouter.use('/missions', securedMissionsRouter)
securedRouter.use('/tags', tagsRouter)
securedRouter.use('/images', imagesRouter)
securedRouter.use('/audio', audioRouter)

export default securedRouter
