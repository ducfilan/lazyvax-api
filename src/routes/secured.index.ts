import { Router } from 'express'
import { securedUserRouter } from '@routes/users.route'
import { securedConversationRouter } from './conversation.route'
import { securedAiRouter } from './ai.route'
import { securedEventRouter } from './event.route'
import { securedObjectiveRouter } from './objective.route'
import securedHabitsRouter from './habit.route'

let securedRouter = Router()

securedRouter.use('/users', securedUserRouter)
securedRouter.use('/conversations', securedConversationRouter)
securedRouter.use('/ai', securedAiRouter)
securedRouter.use('/events', securedEventRouter)
securedRouter.use('/objectives', securedObjectiveRouter)
securedRouter.use('/habits', securedHabitsRouter)

export default securedRouter
