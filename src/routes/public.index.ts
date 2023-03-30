import { Router } from 'express'
import categoriesRoute from '@routes/categories.route'
import { publicUserRouter } from '@routes/users.route'
import { publicSetsRouter } from '@routes/sets.route'
import { publicTopSetRouter } from '@routes/top-sets.route'
import tokenRouter from '@routes/token.route'

let publicRouter = Router()

publicRouter.use('/categories', categoriesRoute)
publicRouter.use('/users', publicUserRouter)
publicRouter.use('/sets', publicSetsRouter)
publicRouter.use('/top-sets', publicTopSetRouter)
publicRouter.use('/token', tokenRouter)

export default publicRouter
