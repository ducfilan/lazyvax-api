import ConfigsDao from "@/dao/configs.dao"
import { Server as HttpServer } from 'http'
import { Server, Socket } from "socket.io"
import { queryChatGPT } from "@/services/support/ai.services"
import { isGoogleTokenValid } from "./google-auth.service"
import { ChatMessage, JoinConversationMessage, User } from "@/common/types"
import usersServices from "../api/users.services"
import { saveMessage } from "../api/messages.services"
import { ObjectId } from "mongodb"
import { isParticipantInConversation } from "../api/conversations.services"

interface ISocket extends Socket {
  isAuthenticated?: boolean;
  user?: User;
}

export const EventNameJoinConversation = "join conversation"
export const EventNameSendMessage = "send message"
export const EventNameReceiveConversationMessage = "conversation message"
export const EventNameAckJoinConversation = "ack join conversation"

export function registerSocketIo(server: HttpServer) {
  ConfigsDao.getAllowedOrigins().then((origins) => {
    const io = new Server(server, {
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

      socket.on('disconnect', () => {
        console.log('User disconnected')
        // client.close()
      })

      async function sendMessageListener(message: ChatMessage) {
        const messageId = await saveMessage({
          conversationId: new ObjectId(message.conversationId),
          authorId: socket.user._id,
          authorName: socket.user.name,
          content: message.content,
          type: message.type,
          timestamp: new Date(),
        })

        socket.to(message.conversationId).emit(EventNameReceiveConversationMessage, {
          ...message,
          id: messageId,
          senderId: socket.user._id
        })
      }

      async function joinConversationListener(message: JoinConversationMessage) {
        const conversationId = new ObjectId(message.conversationId)
        const isParticipant = await isParticipantInConversation(socket.user._id, conversationId)

        if (isParticipant) {
          await socket.join(message.conversationId)
          socket.emit(EventNameAckJoinConversation, {
            conversationId,
          })
        }
      }
    })
  })
}
