import { BotUserId, BotUserName, I18nDbCodeConfirmQuestionnaires, MessageTypeAnswerSmartQuestion, MessageTypeAskUserSmartQuestion, MessageTypeAskConfirmQuestionnaires, MessageTypeStateGoal, MessageTypeConfirmYesQuestionnaires, MessageTypeAckSummaryQuestionnaires } from "@/common/consts"
import { Message } from "@/models/Message"
import { ChatAiService } from "../support/ai.services"
import { saveMessage } from "../api/messages.services"
import { User } from "@/models/User"
import { Readable } from "stream"
import { emitConversationMessage, emitEndTypingUser } from "../support/socket.io.service"
import { Conversation, SmartQuestion } from "@/models/Conversation"
import { getConversation, updateById, updateSmartQuestionAnswer } from "../api/conversations.services"
import ConversationsDao from "@/dao/conversations.dao"
import I18nDao from "@/dao/i18n"

export interface IResponse {
  addObserver(observer: IResponseObserver): void
  preprocess(): Promise<void>
  getResponse(): Promise<Message | null>
}

interface IResponseObserver {
  work(question: SmartQuestion)
}

export class FirstQuestionObserver implements IResponseObserver {
  constructor(private currentMessage: Message, private callback: Function) { }

  async work(smartQuestions: SmartQuestion) {
    const responseMessage: Message = {
      authorId: BotUserId,
      authorName: BotUserName,
      content: smartQuestions.content,
      conversationId: this.currentMessage.conversationId,
      type: MessageTypeAskUserSmartQuestion,
      timestamp: new Date(),
      parentId: this.currentMessage._id,
      parentContent: this.currentMessage.content,
    }

    const [_, messageId] = await Promise.all([
      updateById(this.currentMessage.conversationId, { $push: { smartQuestions } }),
      saveMessage(responseMessage)
    ])

    responseMessage._id = messageId

    this.callback(responseMessage)
  }
}

export class StateGoalResponse implements IResponse {
  private prompt: string
  private smartQuestions: SmartQuestion[]
  private firstQuestion: SmartQuestion
  private firstQuestionObservers: IResponseObserver[]
  private questionMatchRegex: RegExp

  constructor(private currentMessage: Message, private user: User) {
    this.prompt = this.buildPrompt()
    this.smartQuestions = []
    this.firstQuestion = null
    this.firstQuestionObservers = []
    this.questionMatchRegex = /#Q#(.*?)#Q#\s-\s#A#(.*?)::(.*?)?#A#/g
  }

  addObserver(observer: IResponseObserver): void {
    this.firstQuestionObservers.push(observer);
  }

  notifyObservers(data: any): void {
    for (const observer of this.firstQuestionObservers) {
      observer.work(data)
    }
  }

  private buildPrompt(): string {
    // TODO: Move to DB/cache and load with other languages.
    return `Give me questions and answer type (I explain below) for me to answer to make this goal S.M.A.R.T. It is important to give me enough question so that after answer those questions, the goal will be S.M.A.R.T.
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

  private parseAiResponse(response: string) {
    let questionMatch;
    this.questionMatchRegex.lastIndex = 0
    while ((questionMatch = this.questionMatchRegex.exec(response))) {
      this.smartQuestions.push(this.parseQuestion(questionMatch))
    }
  }

  async preprocess(): Promise<void> {
    try {
      ChatAiService.preprocess(this.user)
      const stream = await ChatAiService.query<Readable>(this.prompt, true)

      return new Promise((resolve, reject) => {
        let fullResult = ''

        stream.on('data', (data => {
          try {
            const lines = data.toString().split('\n').filter((line: string) => line.trim() !== '')
            for (const line of lines) {
              const chunk = line.toString().replace(/^data: /, '')
              const isEnd = chunk === '[DONE]'
              if (isEnd) {
                this.parseAiResponse(fullResult)
                updateById(this.currentMessage.conversationId, {
                  $push: {
                    smartQuestions: { $each: this.smartQuestions }
                  }
                })
                resolve()
              }

              const parsed = JSON.parse(chunk)
              fullResult += parsed.choices[0].delta?.content || ''

              if (!this.firstQuestion) {
                this.questionMatchRegex.lastIndex = 0
                const isFirstQuestionAvailable = this.questionMatchRegex.test(fullResult)
                if (isFirstQuestionAvailable) {
                  fullResult = ''
                  this.questionMatchRegex.lastIndex = 0
                  const questionMatches = this.questionMatchRegex.exec(fullResult)
                  this.firstQuestion = this.parseQuestion(questionMatches)
                  this.notifyObservers(this.firstQuestion)
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
      console.error(error)
    }
  }

  async getResponse(): Promise<Message | null> {
    return null
  }
}

export class EmptyResponse implements IResponse {
  addObserver(observer: IResponseObserver): void { }

  async preprocess(): Promise<void> { }

  async getResponse(): Promise<Message | null> {
    return null
  }
}

export class AnswerSmartQuestionResponse implements IResponse {
  constructor(private currentMessage: Message, private user: User) { }

  addObserver(observer: IResponseObserver): void { }

  async preprocess(): Promise<void> {
    const { conversationId, parentContent, content, authorId } = this.currentMessage
    await updateSmartQuestionAnswer(conversationId, parentContent, content, authorId)
  }

  async getResponse(): Promise<Message | null> {
    const conversation = await getConversation(this.currentMessage.conversationId)
    if (!conversation) return null

    const nextQuestion = conversation.smartQuestions.find((question: SmartQuestion) => !question.answer)
    let messageContent = nextQuestion?.content, messageType = MessageTypeAskUserSmartQuestion

    const isAllQuestionAnswered = !nextQuestion

    if (isAllQuestionAnswered) {
      const i18ns = await I18nDao.getByCode(I18nDbCodeConfirmQuestionnaires, this.user.locale)
      messageContent = i18ns[0].content
      messageType = MessageTypeAskConfirmQuestionnaires
    }

    const message: Message = {
      authorId: BotUserId,
      authorName: BotUserName,
      content: messageContent,
      conversationId: this.currentMessage.conversationId,
      type: messageType,
      timestamp: new Date(),
    }

    return message
  }
}

export class ConfirmYesQuestionnairesResponse implements IResponse {
  constructor(private currentMessage: Message, private user: User) { }

  addObserver(observer: IResponseObserver): void { }

  async preprocess(): Promise<void> {
    ChatAiService.preprocess(this.user)
  }

  async summarizeSmartQuestions(conversation: Conversation): Promise<string> {
    // TODO: Move to DB/cache and load with other languages.
    const request = `Summary this conversation to support the goal: "I want to get IELTS 7.0", concisely but enough information, with the "I" pronoun:\n###Conversation:###`

    const qa = conversation.smartQuestions.map((question) => {
      return `Q: ${question.content}\nA: ${question.answer}`
    }).join('\n\n')

    const prompt = `${request}\n${qa}`
    return await ChatAiService.query<string>(prompt)
  }

  async getResponse(): Promise<Message | null> {
    const conversation = await getConversation(this.currentMessage.conversationId)
    if (!conversation) return null

    const summary = await this.summarizeSmartQuestions(conversation)
    await ConversationsDao.updateOneById(conversation._id,
      {
        $set: {
          description: summary,
        }
      }
    )

    const i18ns = await I18nDao.getByCode(I18nDbCodeConfirmQuestionnaires, this.user.locale)
    const messageContent = i18ns[0].content
    const messageType = MessageTypeAckSummaryQuestionnaires

    const message: Message = {
      authorId: BotUserId,
      authorName: BotUserName,
      content: messageContent,
      conversationId: this.currentMessage.conversationId,
      type: messageType,
      timestamp: new Date(),
    }

    return message
  }
}

export class BotResponseFactory {
  static createResponseBuilder(currentMessage: Message, user: User): IResponse {
    switch (currentMessage.type) {
      case MessageTypeStateGoal:
        const builder = new StateGoalResponse(currentMessage, user)
        builder.addObserver(new FirstQuestionObserver(currentMessage, (responseMessage) => {
          const conversationId = currentMessage.conversationId.toHexString()
          responseMessage && emitConversationMessage(conversationId, responseMessage)
          emitEndTypingUser(conversationId, BotUserName)
        }))

        return builder

      case MessageTypeConfirmYesQuestionnaires:
        return new ConfirmYesQuestionnairesResponse(currentMessage, user)

      case MessageTypeAnswerSmartQuestion:
        return new AnswerSmartQuestionResponse(currentMessage, user)

      default:
        return new EmptyResponse()
    }
  }
}
