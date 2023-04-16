import ConfigsDao from "@/dao/configs.dao"
import { Server as HttpServer } from 'http'
import { Server, Socket } from "socket.io"
import { queryChatGPT } from "@/services/support/ai.services"
import { isGoogleTokenValid } from "./google-auth.service";

interface ISocket extends Socket {
  isAuthenticated?: boolean;
  email?: string;
}


export function registerSocketIo(server: HttpServer) {
  ConfigsDao.getAllowedOrigins().then((origins) => {
    const io = new Server(server, {
      cors: {
        origin: origins,
      },
    })

    io.use((socket: ISocket, next) => {
      if (isGoogleTokenValid(socket.handshake.auth.token, socket.handshake.auth.email)) {
        socket.email = socket.handshake.auth.email
        next()
      }

      next(new Error('invalid/expired token'))
    })

    io.on('connection', async (socket: ISocket) => {
      socket.on('message', async (message) => {
        console.log(`Message received: ${message}`)
        const response = await queryChatGPT(message)
        if (response) {
          console.log(`Bot response: ${response}`)
          io.emit('message', response)
          // await collection.insertOne({ message, response })
        }
      })

      socket.on('disconnect', () => {
        console.log('User disconnected')
        // client.close()
      })
    })
  })
}