import { Router } from 'express'
import { securedUserRouter } from '@routes/users.route'
import { securedConversationRouter } from './conversation.route'
import { securedAiRouter } from './ai.route'
import { securedEventRouter } from './event.route'
import { securedGoalRouter } from './goal.route'
import securedHabitsRouter from './habit.route'
import { securedPlanningRouter } from './planning.route'

let securedRouter = Router()

securedRouter.use('/users', securedUserRouter)
securedRouter.use('/conversations', securedConversationRouter)
securedRouter.use('/ai', securedAiRouter)
securedRouter.use('/events', securedEventRouter)
securedRouter.use('/goals', securedGoalRouter)
securedRouter.use('/habits', securedHabitsRouter)
securedRouter.use('/planning', securedPlanningRouter)

export default securedRouter
