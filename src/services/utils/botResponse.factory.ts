import { BotUserId, BotUserName, I18nDbCodeConfirmQuestionnaires } from "@common/consts/constants"
import { Message } from "@/entities/Message"
import { ChatAiService } from "../support/ai_querier"
import { User } from "@/entities/User"
import { Readable } from "stream"
import { emitConversationMessage, emitEndTypingUser } from "../support/socket.io.service"
import { Conversation, MilestoneSuggestion, SmartQuestion } from "@/entities/Conversation"
import { getConversationById, updateById as updateConversationById, updateSmartQuestionAnswer, updateSuggestedMilestone } from "../api/conversations.services"
import ConversationsDao from "@/dao/conversations.dao"
import I18nDao from "@/dao/i18n"
import UsersDao from "@/dao/users.dao"
import { ObjectId } from "mongodb"
import { MessageType } from "@/common/types/types"
import { DoNothingObserver, FirstQuestionObserver, IResponseObserver, MilestoneSuggestionObserver, WaitResponseObserver } from "./responseObservers"
import logger from "@/common/logger"
import { markMessageResponded } from "../api/messages.services"
import { MessageTypeAddMilestoneAndActions, MessageTypeAnswerSmartQuestion, MessageTypeAnswerWeekToDoTasks, MessageTypeConfirmYesQuestionnaires, MessageTypeNextMilestoneAndActions, MessageTypeStateGoal } from "@/common/consts/message-types"
import { normalMessageWorkflow } from "../support/lang_graph/workflows"
import { HumanMessage } from "@langchain/core/messages"

export interface IResponse {
  addObserver(observer: IResponseObserver): IResponse
  preprocess(): Promise<void>
  getResponses(): Promise<Message[]>
  postprocess(): Promise<void>
}

export class BotResponseFactory {
  static createResponseBuilder(currentMessage: Message, user: User): IResponse {
    let builder: IResponse

    switch (currentMessage.type) {
      case MessageTypeStateGoal:
        builder = new StateGoalResponse(currentMessage, user)
        builder.addObserver(new FirstQuestionObserver(currentMessage, (responseMessage) => {
          const conversationId = currentMessage.conversationId.toHexString()
          if (responseMessage) {
            emitConversationMessage(conversationId, responseMessage)
            markMessageResponded(currentMessage._id)
              .catch(err => logger.error("failed to mark message state goal responded", err))
          }
          emitEndTypingUser(conversationId, BotUserName)
        }))

        return builder

      case MessageTypeAnswerWeekToDoTasks:
        builder = new EmptyResponse()
        return builder

      default:
        builder = new AIResponse(currentMessage, user)
        return builder
    }
  }
}

export class StateGoalResponse implements IResponse {
  private prompt: string
  private firstQuestion: SmartQuestion
  private firstQuestionObservers: IResponseObserver[]
  private questionMatchRegex: RegExp

  constructor(private currentMessage: Message, private user: User) {
    this.prompt = this.buildPrompt()
    this.firstQuestion = null
    this.firstQuestionObservers = []
    this.questionMatchRegex = /#Q#(.*?)#Q#\s-\s#A#(.*?)::(.*?)?#A#/g
  }

  addObserver(observer: IResponseObserver): IResponse {
    this.firstQuestionObservers.push(observer);
    return this
  }

  notifyObservers(data: any): void {
    for (const observer of this.firstQuestionObservers) {
      observer.work(data)
    }
  }

  private buildPrompt(): string {
    // TODO: Move to DB/cache and load with other languages.
    return `Give me questions and answer type (I explain below) for me to answer to make this goal S.M.A.R.T. It is important to give me enough question so that after answer those questions, the goal will be S.M.A.R.T.
    You are an expert in goal setting so don't ask so obvious questions, you can assume that.
    Add the answer type, like "date", "number", "text", "selection". If it's "selection", output selection options in this format: [single or multiple]-[option 1||option 2||option n] (specify those options). If it's "number", output the measurement unit next to number if possible, e.g. "number" (days).

    ###Answer format:###
    "#Q#{question}?#Q# - #A#{answer type}::{type properties}#A#"

    ###Example answer from you:###
    #Q#What is this?#Q# - #A#text::#A#
    #Q#How old are you?#Q# - #A#number::#A#
    #Q#How many days?#Q# - #A#number::(days)#A#
    #Q#What’s your level?#Q# - #A#selection::[single]-[Beginner||Intermediate||Advanced]#A#
    #Q#What do you like?#Q# - #A#selection::[multiple]-[A||B||C||D]#A#

    ###Goal:###
    ${this.currentMessage.content.trim()}`
  }

  private parseQuestion(questionMatches: any): SmartQuestion {
    const question: SmartQuestion = {
      content: questionMatches[1].trim(),
      answerType: questionMatches[2].trim() || "text",
    }

    const properties = questionMatches[3]
    if (properties) {
      switch (question.answerType) {
        case "number":
          question.unit = properties.replace(/^\((.*?)\)$/, "$1") // remove parentheses
          break

        case "selection":
          const propertiesMatch = properties.match(/\[(single|multiple)\]-\[(.*?)\]/)
          if (propertiesMatch) {
            const [_, type, options] = propertiesMatch;
            const parsedOptions = options.split("||");
            question.selection = { type, options: parsedOptions }
          }
      }
    }

    return question
  }

  async preprocess(): Promise<void> {
    try {
      const stream = await ChatAiService.query<Readable>(this.user, this.prompt, true)

      return new Promise((resolve, reject) => {
        let fullResult = ''

        stream.on('data', (data => {
          try {
            const lines = data.toString().split('\n').filter((line: string) => line.trim() !== '')
            for (const line of lines) {
              const chunk = line.toString().replace(/^data: /, '')
              const isEnd = chunk === '[DONE]'
              if (isEnd) {
                updateConversationById(this.currentMessage.conversationId, {
                  $set: {
                    smartQuestionFetchDone: true
                  }
                })
                resolve()
              }

              const parsed = JSON.parse(chunk)
              fullResult += parsed.choices?.[0].delta?.content || ''

              this.questionMatchRegex.lastIndex = 0
              const isQuestionAvailable = this.questionMatchRegex.test(fullResult)
              if (isQuestionAvailable) {
                this.questionMatchRegex.lastIndex = 0
                const questionMatches = this.questionMatchRegex.exec(fullResult)
                const question = this.parseQuestion(questionMatches)
                fullResult = ''

                if (!this.firstQuestion) {
                  this.firstQuestion = question
                  this.notifyObservers(this.firstQuestion)
                } else {
                  updateConversationById(this.currentMessage.conversationId, {
                    $push: {
                      smartQuestions: question
                    }
                  })
                }
              }
            }
          } catch (error) {
            reject(error)
          }
        }).bind(this))
      })

    } catch (error) {
      // TODO: Handle the error.
      logger.error(error)
    }
  }

  async getResponses(): Promise<Message[]> {
    return []
  }

  async postprocess(): Promise<void> {
  }
}

export class EmptyResponse implements IResponse {
  addObserver(observer: IResponseObserver): IResponse {
    return this
  }

  async preprocess(): Promise<void> { }

  async getResponses(): Promise<Message[]> {
    return []
  }

  async postprocess(): Promise<void> {
  }
}

export class AIResponse implements IResponse {
  private observers: IResponseObserver[]

  constructor(private currentMessage: Message, private user: User) {
    this.observers = []
  }

  addObserver(observer: IResponseObserver): IResponse {
    this.observers.push(observer);
    return this
  }

  notifyObservers(data: any): void {
    for (const observer of this.observers) {
      observer.work(data)
    }
  }

  async preprocess(): Promise<void> {
  }

  async getResponses(): Promise<Message[]> {
    normalMessageWorkflow.runWorkflow({
      userInfo: this.user,
      conversationId: this.currentMessage.conversationId,
      messages: [new HumanMessage(this.currentMessage.content)]
    })
    return []
  }

  async postprocess(): Promise<void> {
  }
}
