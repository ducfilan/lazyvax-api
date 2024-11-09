import { ObjectId } from "mongodb"
import { parse } from "cookie"
import { Server as HttpServer } from 'http'
import { Server as SocketServer, Socket } from "socket.io"
import { getOrigins } from "@/app"
import { isGoogleTokenValid, newGoogleOAuth2Client } from "./google-auth.service"
import { AddActionMessage, AddMilestoneAndActionsMessage, ChatMessage, ConfirmFirstDayCoreTasksMessage, ConfirmNextDayTasksMessage, ConfirmWeekToDoTasksMessage, CreateConversationMessage, EditActionMessage, EditMilestoneMessage, FinishQuestionnairesMessage, GenerateWeekPlanFullMessage, JoinConversationMessage, MessageContent, NextMilestoneAndActionsMessage } from "@/common/types/types"
import { getUserByEmail } from "@services/api/users.services"
import { queryGenerateWeekPlan } from '@services/api/ai.services'
import { markMessageResponded, saveMessage } from "../api/messages.services"
import { addMilestoneAction, addUserMilestone, createConversation, editMilestone, editMilestoneAction, generateFirstMessages, isParticipantInConversation, updateProgress } from "../api/conversations.services"
import { BotUserId, BotUserName, CalendarSourceApp, DefaultLangCode, I18nDbCodeIntroduceHowItWorks, MilestoneSourceSuggestion, PlanTypeWeekInteractive } from "@common/consts/constants"
import { MessageTypeAddMilestoneAndActions, MessageTypeAnswerWeekToDoTasks, MessageTypeNextMilestoneAndActions, MessageTypePlainText, MessageTypeRetryGetResponse } from "@common/consts/message-types"
import I18nDao from "@/dao/i18n"
import { Message, MessageGroupBuilder } from "@/entities/Message"
import { ConversationBuilder } from "../utils/conversation.utils"
import { getDbClient, transactionOptions } from "@/common/configs/mongodb-client.config"
import { User } from "@/entities/User"
import { Event } from "@/entities/Event"
import MessagesDao from "@/dao/messages.dao"
import { BotResponseFactory } from "../utils/botResponse.factory"
import logger from "@/common/logger"
import { tryParseJson } from '@/common/utils/stringUtils'
import { createMultipleEvents } from "@services/api/events.services"
import { addEventsToGoogleCalendar } from "./calendar_facade"
import { OAuth2Client } from "google-auth-library"
import { ConversationProgressGeneratedFullDone } from "@/dao/conversations.dao"
import { weeklyPlanningWorkflow } from "./lang_graph/workflows"
import {
  EventNameJoinConversation,
  EventNameSendMessage,
  EventNameConversationMessage,
  EventNameTypingUser,
  EventNameEndTypingUser,
  EventNameFinishQuestionnaires,
  EventNameCreateConversation,
  EventNameAddMilestoneAndActions,
  EventNameEditMilestoneAndActions,
  EventNameNextMilestoneAndActions,
  EventNameAddAction,
  EventNameEditAction,
  EventNameWaitResponse,
  EventNameConfirmToGenerateWeekPlanFull,
  EventNameConfirmToGenerateWeekPlanInteractive,
  EventNameConfirmWeekToDoTasks,
  EventNameConfirmFirstDayCoreTasks,
  EventNameConfirmNextDayTasks,
  EventNameConfirmToGenerateNextDayTasks,
} from "@/common/consts/event-names"

interface ISocket extends Socket {
  isAuthenticated?: boolean;
  user?: User;
  oAuth2Client: OAuth2Client
}

const ErrorMessageInvalidToken = "invalid/expired token"
const ErrorMessageNotParticipant = "not participant"

export let io: SocketServer

export function emitConversationMessage(conversationId: string, message: any) {
  io.in(`conversation:${conversationId}`).emit(EventNameConversationMessage, message)
}

export function emitEndTypingUser(conversationId: string, userName: any) {
  io.in(`conversation:${conversationId}`).emit(EventNameEndTypingUser, userName)
}

export function emitTypingUser(conversationId: string, userName: any) {
  io.in(`conversation:${conversationId}`).emit(EventNameTypingUser, userName)
}

export function emitWaitResponse(userId: string, responseType: any) {
  io.in(`user:${userId}`).emit(EventNameWaitResponse, responseType)
}

export function registerSocketIo(server: HttpServer) {
  getOrigins()
    .then((origins) => {
      io = new SocketServer(server, {
        cors: {
          origin: origins,
          credentials: true,
        },
      })

      io.use((socket: ISocket, next) => {
        const { authToken: token } = parse(socket.request.headers.cookie)

        isGoogleTokenValid(token || socket.handshake.auth.token, socket.handshake.auth.email).then((isTokenValid) => {
          if (isTokenValid) {
            socket.oAuth2Client = newGoogleOAuth2Client({ access_token: token })
            const email = socket.handshake.auth.email
            getUserByEmail(email)
              .then((user) => socket.user = user)
              .catch(err => {
                logger.error(err)
                next(new Error('cannot get user by email'))
              })

            next()
          } else {
            logger.error('socket.io not authenticated for ' + socket.handshake.auth.email)
            next(new Error(ErrorMessageInvalidToken))
          }
        })
      })

      io.on('connection', async (socket: ISocket) => {
        socket.on(EventNameSendMessage, sendMessageListener)
        socket.on(EventNameJoinConversation, joinConversationListener)
        socket.on(EventNameFinishQuestionnaires, finishQuestionnairesListener)
        socket.on(EventNameCreateConversation, createNewConversation)
        socket.on(EventNameAddMilestoneAndActions, addMilestoneAndActions)
        socket.on(EventNameEditMilestoneAndActions, editMilestoneAndActions)
        socket.on(EventNameNextMilestoneAndActions, nextMilestoneAndActions)
        socket.on(EventNameAddAction, addAction)
        socket.on(EventNameEditAction, editAction)
        socket.on(EventNameConfirmToGenerateWeekPlanFull, generateWeekPlanFull)
        socket.on(EventNameConfirmToGenerateWeekPlanInteractive, generateWeekPlanInteractive)
        socket.on(EventNameConfirmWeekToDoTasks, confirmWeekToDoTasks)
        socket.on(EventNameConfirmFirstDayCoreTasks, confirmFirstDayCoreTasks)
        socket.on(EventNameConfirmToGenerateNextDayTasks, confirmToGenerateNextDayTasks)
        socket.on(EventNameConfirmNextDayTasks, confirmNextDayTasks)

        socket.on('disconnect', () => {
          logger.info('User disconnected')
        })

        async function sendMessageListener(chatMessage: ChatMessage, ack: any) {
          // TODO: Validate message.

          try {
            const message = await processIncomingMessage(chatMessage)
            ack(message._id)

            await respondMessage(message)
          } catch (error) {
            logger.error(error)
          }
        }

        async function processIncomingMessage(chatMessage: ChatMessage): Promise<Message> {
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
          chatMessage.needResponse && (message.isResponded = false)

          switch (message.type) {
            case MessageTypeRetryGetResponse: {
              const retryMessageContent = tryParseJson<MessageContent>(message.content)
              message.content = retryMessageContent.content
              message.type = retryMessageContent.type
              message._id = new ObjectId(retryMessageContent.parentId)

              return message
            }

            case MessageTypeAnswerWeekToDoTasks: {
              weeklyPlanningWorkflow.runWorkflow({
                userInfo: socket.user,
                conversationId: message.conversationId,
                weekToDoTasks: chatMessage.content.split("\n").map(t => t.trim()), // TODO: More sophisticated parsing.
              })
            }

            default:
              const messageId = await saveMessage(message)

              emitConversationMessage(message.conversationId.toHexString(), {
                ...chatMessage,
                id: messageId,
                authorId: socket.user._id,
              })
          }

          return message
        }

        async function joinConversationListener(message: JoinConversationMessage, ack: any) {
          try {
            if (!socket.user) {
              ack({
                error: ErrorMessageInvalidToken
              })
              return
            }

            const conversationId = new ObjectId(message.conversationId)
            const isParticipant = await isParticipantInConversation(socket.user._id, conversationId)

            if (isParticipant) {
              await socket.join(`conversation:${message.conversationId}`)
              ack({
                data: {
                  conversationId
                }
              })

              weeklyPlanningWorkflow.runWorkflow({
                userInfo: socket.user,
                conversationId
              })
            } else {
              ack({
                error: ErrorMessageNotParticipant
              })
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

        async function createNewConversation(message: CreateConversationMessage, ack: any) {
          try {
            const conversation = await new ConversationBuilder(message).build()
            conversation.userId = socket.user._id

            const session = getDbClient().startSession()
            await session.withTransaction(async () => {
              const conversationId = await createConversation(conversation)

              const firstMessages = await generateFirstMessages(message.conversation.type, socket.user?.locale || DefaultLangCode)
              await MessagesDao.insertMany(new MessageGroupBuilder(firstMessages).build(conversationId))

              conversation._id = conversationId

              ack(conversation)
            }, transactionOptions)
          } catch (error) {
            logger.error(error)
          }
        }

        async function addMilestoneAndActions(message: AddMilestoneAndActionsMessage, ack: any) {
          const conversationId = new ObjectId(message.conversationId)
          const milestoneId = message.milestoneId ? new ObjectId(message.milestoneId) : new ObjectId()

          await addUserMilestone(conversationId, {
            _id: milestoneId,
            milestone: message.milestone,
            source: message.source || MilestoneSourceSuggestion,
            actions: message.actions?.map(action => ({
              _id: new ObjectId(),
              action,
            })) || [],
          })
          ack(milestoneId)

          if (message.source === MilestoneSourceSuggestion) {
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
        }

        async function editMilestoneAndActions(message: EditMilestoneMessage, ack: any) {
          const conversationId = new ObjectId(message.conversationId)
          const milestoneId = new ObjectId(message.milestoneId)

          await editMilestone(conversationId, milestoneId, message.milestone)
          ack(milestoneId)
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
          if (responseMessages?.length) {
            for (const responseMessage of responseMessages) {
              await saveMessage(responseMessage)
              emitConversationMessage(conversationIdHex, responseMessage)
            }
          }

          currentMessage.isResponded === false && (await markMessageResponded(currentMessage._id))
          emitEndTypingUser(conversationIdHex, BotUserName)
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

        async function generateWeekPlanFull(message: GenerateWeekPlanFullMessage, ack: any) {
          try {
            const conversationId = new ObjectId(message.conversationId)

            const chatMessage = {
              conversationId: new ObjectId(message.conversationId),
              authorId: BotUserId,
              authorName: BotUserName,
              content: "Generating, wait...", // TODO: i18n
              type: MessageTypePlainText,
              timestamp: new Date(),
            } as Message

            chatMessage._id = await saveMessage(chatMessage)

            emitConversationMessage(message.conversationId, chatMessage)
            ack(conversationId)

            const response = await queryGenerateWeekPlan(socket.user, conversationId)
            const generatedEvents = JSON.parse(response)

            const events = generatedEvents.map((item) => {
              const startDate = new Date(item.start_time)
              const endDate = new Date(item.end_time)

              const event: Event = {
                _id: new ObjectId(),
                userId: socket.user._id,
                source: CalendarSourceApp,
                title: item.activity,
                description: item.reason,
                startDate,
                endDate,
                attendees: [{
                  email: socket.user.email,
                  name: socket.user.name,
                  response: 'accepted'
                }],
              }

              return event
            })
            await createMultipleEvents(events)

            await addEventsToGoogleCalendar(socket.oAuth2Client, events, socket.user.preferences?.timezone) // TODO: transaction handling, make sure it's added to Google Calendar.
            await updateProgress(conversationId, ConversationProgressGeneratedFullDone)
          } catch (error) {
            logger.error(error)
          }
        }

        async function generateWeekPlanInteractive(message: GenerateWeekPlanFullMessage, ack: any) {
          try {
            const conversationId = new ObjectId(message.conversationId)

            weeklyPlanningWorkflow.runWorkflow({
              userInfo: socket.user,
              conversationId,
              planType: PlanTypeWeekInteractive,
            })

            ack(conversationId)
          } catch (error) {
            logger.error(error)
          }
        }

        async function confirmWeekToDoTasks(message: ConfirmWeekToDoTasksMessage, ack: any) {
          try {
            const conversationId = new ObjectId(message.conversationId)

            weeklyPlanningWorkflow.runWorkflow({
              userInfo: socket.user,
              conversationId,
              weekToDoTasksConfirmed: true,
            })

            ack(conversationId)
          } catch (error) {
            logger.error(error)
          }
        }

        async function confirmFirstDayCoreTasks(message: ConfirmFirstDayCoreTasksMessage, ack: any) {
          const conversationId = new ObjectId(message.conversationId)

          weeklyPlanningWorkflow.runWorkflow({
            userInfo: socket.user,
            conversationId,
          }, {
            target: 'daysInWeekTasksConfirmed',
            targetType: 'array',
            targetIndex: message.index,
            value: true,
          })

          ack(conversationId)
        }

        async function confirmToGenerateNextDayTasks(message: ConfirmNextDayTasksMessage, ack: any) {
          const conversationId = new ObjectId(message.conversationId)

          weeklyPlanningWorkflow.runWorkflow({
            userInfo: socket.user,
            conversationId,
            nextDayIndex: message.index,
          }, {
            target: 'daysInWeekTasksConfirmedToSuggest',
            targetType: 'array',
            targetIndex: message.index,
            value: true,
          })

          ack(conversationId)
        }

        async function confirmNextDayTasks(message: ConfirmNextDayTasksMessage, ack: any) {
          const conversationId = new ObjectId(message.conversationId)

          weeklyPlanningWorkflow.runWorkflow({
            userInfo: socket.user,
            conversationId,
            nextDayIndex: message.index,
          }, {
            target: 'daysInWeekTasksConfirmed',
            targetType: 'array',
            targetIndex: message.index,
            value: true,
          })

          ack(conversationId)
        }
      })
    })
}
