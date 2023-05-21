import ConfigsDao from "@/dao/configs.dao"
import { Server as HttpServer } from 'http'
import { Server, Socket } from "socket.io"
import { isGoogleTokenValid } from "./google-auth.service"
import { ChatMessage, CreateNewGoalMessage, FinishQuestionnairesMessage, JoinConversationMessage } from "@/common/types"
import usersServices, { addConversation as addUserConversation } from "../api/users.services"
import { saveMessage } from "../api/messages.services"
import { ObjectId } from "mongodb"
import { createConversation, generateFirstMessages, isParticipantInConversation } from "../api/conversations.services"
import { BotUserId, BotUserName, ConversationTypeGoal, DefaultLangCode, I18nDbCodeIntroduceHowItWorks, MessageTypeRunningText } from "@/common/consts"
import I18nDao from "@/dao/i18n"
import { Message, MessageGroupBuilder } from "@/models/Message"
import { ConversationBuilder } from "../utils/conversation.utils"
import { getDbClient, transactionOptions } from "@/common/configs/mongodb-client.config"
import { User } from "@/models/User"
import MessagesDao from "@/dao/messages.dao"
import { BotResponseFactory } from "../utils/botResponse.factory"

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

export let io: Server

export function emitConversationMessage(conversationId: string, message: any) {
  io.in(`conversation:${conversationId}`).emit(EventNameConversationMessage, message)
}

export function emitEndTypingUser(conversationId: string, userName: any) {
  io.in(`conversation:${conversationId}`).emit(EventNameEndTypingUser, userName)
}

export function emitTypingUser(conversationId: string, userName: any) {
  io.in(`conversation:${conversationId}`).emit(EventNameTypingUser, userName)
}

export function registerSocketIo(server: HttpServer) {
  ConfigsDao.getAllowedOrigins().then((origins) => {
    io = new Server(server, {
      cors: {
        origin: origins,
      },
    })

    io.use(async (socket: ISocket, next) => {
      if (isGoogleTokenValid(socket.handshake.auth.token, socket.handshake.auth.email)) {
        const email = socket.handshake.auth.email
        const user = await usersServices.getUserByEmail(email)
        socket.user = user

        next()
      } else {
        console.log('socket.io not authenticated' + socket.handshake.auth.email)
        next(new Error('invalid/expired token'))
      }
    })

    io.on('connection', async (socket: ISocket) => {
      socket.on(EventNameSendMessage, sendMessageListener)
      socket.on(EventNameJoinConversation, joinConversationListener)
      socket.on(EventNameFinishQuestionnaires, finishQuestionnairesListener)
      socket.on(EventNameCreateNewGoal, createNewGoal)

      socket.on('disconnect', () => {
        console.log('User disconnected')
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
            senderId: socket.user._id,
          })

          emitTypingUser(chatMessage.conversationId, BotUserName)

          const builder = BotResponseFactory.createResponseBuilder(message, socket.user)
          await builder.preprocess()
          const responseMessage = await builder.getResponse()
          if (responseMessage) {
            await saveMessage(responseMessage)
            emitConversationMessage(chatMessage.conversationId, responseMessage)
            emitEndTypingUser(chatMessage.conversationId, BotUserName)
          }
        } catch (error) {
          console.log(error)
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
          console.log(error)
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
            type: MessageTypeRunningText,
            timestamp: new Date(),
          } as Message

          chatMessage._id = await saveMessage(chatMessage)

          io.in(`conversation:${message.conversationId}`).emit(EventNameConversationMessage, chatMessage)
        } catch (error) {
          console.log(error)
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
          console.log(error)
        }
      }
    })
  })
}
