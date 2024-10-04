import { Router } from 'express'
import ConversationsController from '@controllers/conversations.controller'
import auth from '@middlewares/global/auth.mw'
import { validateApiGetConversationById, validateApiGetConversationByType, validateApiGetMessages, validateApiUpdateConversation } from '@/validators/conversations.validator'

const securedConversationRouter = Router()

securedConversationRouter.route('/').get(auth, validateApiGetConversationByType, ConversationsController.getConversationByType)
securedConversationRouter.route('/:conversationId').get(auth, validateApiGetConversationById, ConversationsController.getConversationById)
securedConversationRouter.route('/:conversationId').post(auth, validateApiUpdateConversation, ConversationsController.updateConversation)
securedConversationRouter.route('/:conversationId/messages').get(auth, validateApiGetMessages, ConversationsController.getMessages)

export {
  securedConversationRouter
}
