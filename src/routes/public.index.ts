import { Router } from 'express'
import { publicUserRouter } from '@routes/users.route'
import tokenRouter from '@routes/token.route'

let publicRouter = Router()

publicRouter.use('/users', publicUserRouter)
publicRouter.use('/token', tokenRouter)

export default publicRouter
