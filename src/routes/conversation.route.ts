import { Router } from 'express'
import ConversationsController from '@controllers/conversations.controller'
import auth from '@middlewares/global/auth.mw'
import { validateApiGetConversation, validateApiGetMessages, validateApiUpdateConversation } from '@/validators/conversations.validator'

const securedConversationRouter = Router()

securedConversationRouter.route('/:conversationId').get(auth, validateApiGetConversation, ConversationsController.getConversation)
securedConversationRouter.route('/:conversationId').post(auth, validateApiUpdateConversation, ConversationsController.updateConversation)
securedConversationRouter.route('/:conversationId/messages').get(auth, validateApiGetMessages, ConversationsController.getMessages)

export {
  securedConversationRouter
}
