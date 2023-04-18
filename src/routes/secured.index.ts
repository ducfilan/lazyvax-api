import { Router } from 'express'
import { securedUserRouter } from '@routes/users.route'
import { securedConversationRouter } from './conversation.route'

let securedRouter = Router()

securedRouter.use('/users', securedUserRouter)
securedRouter.use('/conversations', securedConversationRouter)

export default securedRouter
