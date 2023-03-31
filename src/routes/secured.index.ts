import { Router } from 'express'
import { securedUserRouter } from '@routes/users.route'

let securedRouter = Router()

securedRouter.use('/users', securedUserRouter)

export default securedRouter
