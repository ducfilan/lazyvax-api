import ConfigsDao from "@/dao/configs.dao"
import { Server as HttpServer } from 'http'
import { parse } from "cookie"
import { Server, Socket } from "socket.io"
import { isGoogleTokenValid } from "./google-auth.service"
import { AddActionMessage, AddMilestoneAndActionsMessage, ChatMessage, CreateNewGoalMessage, EditActionMessage, FinishQuestionnairesMessage, JoinConversationMessage, NextMilestoneAndActionsMessage } from "@/common/types"
import usersServices, { addConversation as addUserConversation } from "../api/users.services"
import { saveMessage } from "../api/messages.services"
import { ObjectId } from "mongodb"
import { addMilestoneAction, addUserMilestone, createConversation, editMilestoneAction, generateFirstMessages, isParticipantInConversation, updateSuggestedMilestone } from "../api/conversations.services"
import { BotUserId, BotUserName, ConversationTypeGoal, DefaultLangCode, I18nDbCodeIntroduceHowItWorks, MessageTypeAddMilestoneAndActions, MessageTypeNextMilestoneAndActions, MessageTypePlainText, MilestoneSourceSuggestion } from "@/common/consts"
import I18nDao from "@/dao/i18n"
import { Message, MessageGroupBuilder } from "@/models/Message"
import { ConversationBuilder } from "../utils/conversation.utils"
import { getDbClient, transactionOptions } from "@/common/configs/mongodb-client.config"
import { User } from "@/models/User"
import MessagesDao from "@/dao/messages.dao"
import { BotResponseFactory } from "../utils/botResponse.factory"
import { getOrigins } from "@/app"
import logger from "@/common/logger"

interface ISocket extends Socket {
  isAuthenticated?: boolean;
  user?: User;
}

export const EventNameJoinConversation = "join conversation"
export const EventNameSendMessage = "send message"
export const EventNameConversationMessage = "conversation message"
export const EventNameTypingUser = "user typing"
export const EventNameEndTypingUser = "user end typing"
export const EventNameFinishQuestionnaires = "fin questionnaires"
export const EventNameCreateNewGoal = "create goal"
export const EventNameAddMilestoneAndActions = "add milestone & actions"
export const EventNameNextMilestoneAndActions = "next milestone & actions"
export const EventNameAddAction = "add action"
export const EventNameEditAction = "edit action"

export let io: Server

export function emitConversationMessage(conversationId: string, message: any) {
  logger.debug('message: ', message)
  io.in(`conversation:${conversationId}`).emit(EventNameConversationMessage, message)
}

export function emitEndTypingUser(conversationId: string, userName: any) {
  io.in(`conversation:${conversationId}`).emit(EventNameEndTypingUser, userName)
}

export function emitTypingUser(conversationId: string, userName: any) {
  io.in(`conversation:${conversationId}`).emit(EventNameTypingUser, userName)
}

export function registerSocketIo(server: HttpServer) {
  getOrigins()
    .then((origins) => {
      io = new Server(server, {
        cors: {
          origin: origins,
          credentials: true,
        },
      })

      io.use(async (socket: ISocket, next) => {
        const { authToken: token } = parse(socket.request.headers.cookie)

        if (isGoogleTokenValid(token || socket.handshake.auth.email, socket.handshake.auth.email)) {
          const email = socket.handshake.auth.email
          const user = await usersServices.getUserByEmail(email)
          socket.user = user

          next()
        } else {
          logger.error('socket.io not authenticated' + socket.handshake.auth.email)
          next(new Error('invalid/expired token'))
        }
      })

      io.on('connection', async (socket: ISocket) => {
        socket.on(EventNameSendMessage, sendMessageListener)
        socket.on(EventNameJoinConversation, joinConversationListener)
        socket.on(EventNameFinishQuestionnaires, finishQuestionnairesListener)
        socket.on(EventNameCreateNewGoal, createNewGoal)
        socket.on(EventNameAddMilestoneAndActions, addMilestoneAndActions)
        socket.on(EventNameNextMilestoneAndActions, nextMilestoneAndActions)
        socket.on(EventNameAddAction, addAction)
        socket.on(EventNameEditAction, editAction)

        socket.on('disconnect', () => {
          logger.info('User disconnected')
        })

        async function sendMessageListener(chatMessage: ChatMessage, ack: any) {
          // TODO: Validate message.

          try {
            const message: Message = {
              conversationId: new ObjectId(chatMessage.conversationId),
              authorId: socket.user._id,
              authorName: socket.user.name,
              content: chatMessage.content,
              type: chatMessage.type,
              timestamp: new Date(),
            }

            chatMessage.parentContent && (message.parentContent = chatMessage.parentContent)
            chatMessage.parentId && (message.parentId = new ObjectId(chatMessage.parentId))

            const messageId = await saveMessage(message)
            ack(messageId)

            emitConversationMessage(chatMessage.conversationId, {
              ...chatMessage,
              id: messageId,
              authorId: socket.user._id,
            })

            await respondMessage(message)
          } catch (error) {
            logger.error(error)
          }
        }

        async function joinConversationListener(message: JoinConversationMessage, ack: any) {
          try {
            const conversationId = new ObjectId(message.conversationId)
            const isParticipant = await isParticipantInConversation(socket.user._id, conversationId)

            if (isParticipant) {
              await socket.join(`conversation:${message.conversationId}`)
              ack(conversationId)
            } else {
              ack(null)
            }
          } catch (error) {
            logger.error(error)
          }
        }

        async function finishQuestionnairesListener(message: FinishQuestionnairesMessage) {
          try {
            const content = (await I18nDao.getByCode(I18nDbCodeIntroduceHowItWorks, socket.user.locale))?.at(0).content

            const chatMessage = {
              conversationId: new ObjectId(message.conversationId),
              authorId: BotUserId,
              authorName: BotUserName,
              content: content,
              type: MessageTypePlainText,
              timestamp: new Date(),
            } as Message

            chatMessage._id = await saveMessage(chatMessage)

            emitConversationMessage(message.conversationId, chatMessage)
          } catch (error) {
            logger.error(error)
          }
        }

        async function createNewGoal(message: CreateNewGoalMessage, ack: any) {
          try {
            const conversation = await new ConversationBuilder(message).build()

            const session = getDbClient().startSession()
            await session.withTransaction(async () => {
              const conversationId = await createConversation(conversation)

              const firstMessages = await generateFirstMessages(ConversationTypeGoal, socket.user?.locale || DefaultLangCode)
              await MessagesDao.insertMany(new MessageGroupBuilder(firstMessages).build(conversationId))

              conversation._id = conversationId
              await addUserConversation(socket.user, conversation)

              ack(conversationId)
            }, transactionOptions)
          } catch (error) {
            logger.error(error)
          }
        }

        async function addMilestoneAndActions(message: AddMilestoneAndActionsMessage, ack: any) {
          const conversationId = new ObjectId(message.conversationId)
          const milestoneId = new ObjectId(message.milestoneId)

          await addUserMilestone(conversationId, {
            _id: milestoneId,
            milestone: message.milestone,
            source: MilestoneSourceSuggestion,
            actions: message.actions.map(action => ({
              _id: new ObjectId(),
              action,
            })),
          })
          ack(milestoneId)

          const fakeCurrentMessage = {
            conversationId,
            type: MessageTypeAddMilestoneAndActions,
            authorId: socket.user._id,
            authorName: socket.user.name,
            timestamp: new Date(),
            content: ""
          }

          await respondMessage(fakeCurrentMessage)
        }

        async function nextMilestoneAndActions(message: NextMilestoneAndActionsMessage, ack: any) {
          const conversationId = new ObjectId(message.conversationId)

          const fakeCurrentMessage: Message = {
            conversationId,
            type: MessageTypeNextMilestoneAndActions,
            authorId: socket.user._id,
            authorName: socket.user.name,
            timestamp: new Date(),
            content: ""
          }

          await respondMessage(fakeCurrentMessage)
          ack(true)
        }

        async function respondMessage(currentMessage: Message) {
          const conversationIdHex = currentMessage.conversationId.toHexString()

          emitTypingUser(conversationIdHex, BotUserName)

          const builder = BotResponseFactory.createResponseBuilder(currentMessage, socket.user)
          await builder.preprocess()
          const responseMessages = await builder.getResponses()
          if (responseMessages && responseMessages.length) {
            for (const responseMessage of responseMessages) {
              await saveMessage(responseMessage)
              emitConversationMessage(conversationIdHex, responseMessage)
            }

            emitEndTypingUser(conversationIdHex, BotUserName)
          }
          await builder.postprocess()
        }

        async function addAction(message: AddActionMessage, ack: any) {
          try {
            const conversationId = new ObjectId(message.conversationId)
            const milestoneId = new ObjectId(message.milestoneId)

            const actionId = await addMilestoneAction(conversationId, milestoneId, message.action)
            ack(actionId)
          } catch (error) {
            ack(null)
          }
        }

        async function editAction(message: EditActionMessage, ack: any) {
          try {
            const conversationId = new ObjectId(message.conversationId)
            const milestoneId = new ObjectId(message.milestoneId)
            const actionId = new ObjectId(message.actionId)

            await editMilestoneAction(conversationId, milestoneId, actionId, message.action, message.isDone)
            ack(true)
          } catch (error) {
            ack(false)
          }
        }
      })
    })
}
