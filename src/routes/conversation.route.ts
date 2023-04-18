import { Router } from 'express'
import ConversationsController from '@controllers/conversations.controller'
import auth from '@middlewares/global/auth.mw'
import { validateApiGetMessages } from '@/validators/conversations.validator'

const securedConversationRouter = Router()

securedConversationRouter.route('/:conversationId/messages').get(auth, validateApiGetMessages, ConversationsController.getMessages)

export {
  securedConversationRouter
}
