import { BotUserId, BotUserName, I18nDbCodeConfirmQuestionnaires, MessageTypeAnswerSmartQuestion, MessageTypeAskUserSmartQuestion, MessageTypeAskConfirmQuestionnaires, MessageTypeStateGoal, MessageTypeConfirmYesQuestionnaires, MessageTypeAckSummaryQuestionnaires, I18nDbCodeSummarizeQuestionnaires, MessageTypeAddMilestoneAndActions, MilestoneSourceSuggestion, MessageTypeSuggestMilestoneAndActions, MessageTypePlainText, MessageTypeNextMilestoneAndActions } from "@/common/consts"
import { Message } from "@/models/Message"
import { ChatAiService } from "../support/ai.services"
import { User } from "@/models/User"
import { Readable } from "stream"
import { emitConversationMessage, emitEndTypingUser } from "../support/socket.io.service"
import { Conversation, MilestoneSuggestion, SmartQuestion } from "@/models/Conversation"
import { getConversation, getSmartQuestions, getUserMilestones, updateById as updateConversationById, updateSmartQuestionAnswer, updateSuggestedMilestone } from "../api/conversations.services"
import ConversationsDao from "@/dao/conversations.dao"
import I18nDao from "@/dao/i18n"
import UsersDao from "@/dao/users.dao"
import { ObjectId } from "mongodb"
import { MessageType } from "@/common/types"
import { FirstQuestionObserver, IResponseObserver, MilestoneSuggestionObserver } from "./responseObservers"
import logger from "@/common/logger"

export interface IResponse {
  addObserver(observer: IResponseObserver): void
  preprocess(): Promise<void>
  getResponses(): Promise<Message[]>
  postprocess(): Promise<void>
}

export class BotResponseFactory {
  static createResponseBuilder(currentMessage: Message, user: User): IResponse {
    switch (currentMessage.type) {
      case MessageTypeStateGoal:
        const builderStateGoal = new StateGoalResponse(currentMessage, user)
        builderStateGoal.addObserver(new FirstQuestionObserver(currentMessage, (responseMessage) => {
          const conversationId = currentMessage.conversationId.toHexString()
          responseMessage && emitConversationMessage(conversationId, responseMessage)
          emitEndTypingUser(conversationId, BotUserName)
        }))

        return builderStateGoal

      case MessageTypeConfirmYesQuestionnaires:
        const builderSummary = new ConfirmYesQuestionnairesResponse(currentMessage, user)
        builderSummary.addObserver(new MilestoneSuggestionObserver(currentMessage, (responseMessage) => {
          logger.debug('responseMessage', responseMessage)

          const conversationId = currentMessage.conversationId.toHexString()
          responseMessage && emitConversationMessage(conversationId, responseMessage)
          emitEndTypingUser(conversationId, BotUserName)
        }))
        return builderSummary

      case MessageTypeAnswerSmartQuestion:
        return new AnswerSmartQuestionResponse(currentMessage, user)

      case MessageTypeAddMilestoneAndActions:
      case MessageTypeNextMilestoneAndActions:
        return new NextMilestoneAndActionsResponse(currentMessage, user)

      default:
        return new EmptyResponse()
    }
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
                updateConversationById(this.currentMessage.conversationId, {
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
                  this.questionMatchRegex.lastIndex = 0
                  const questionMatches = this.questionMatchRegex.exec(fullResult)
                  this.firstQuestion = this.parseQuestion(questionMatches)
                  this.notifyObservers(this.firstQuestion)
                  fullResult = ''
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
  addObserver(observer: IResponseObserver): void { }

  async preprocess(): Promise<void> { }

  async getResponses(): Promise<Message[]> {
    return []
  }

  async postprocess(): Promise<void> {
  }
}

export class AnswerSmartQuestionResponse implements IResponse {
  constructor(private currentMessage: Message, private user: User) { }

  addObserver(observer: IResponseObserver): void { }

  async preprocess(): Promise<void> {
    const { conversationId, parentContent, content, authorId } = this.currentMessage
    await updateSmartQuestionAnswer(conversationId, parentContent, content, authorId)
  }

  async getResponses(): Promise<Message[]> {
    const smartQuestions = await getSmartQuestions(this.currentMessage.conversationId)
    if (!smartQuestions) return null

    const nextQuestion = smartQuestions.find((question: SmartQuestion) => !question.answer)
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

    return [message]
  }

  async postprocess(): Promise<void> {
  }
}

export class ConfirmYesQuestionnairesResponse implements IResponse {
  private conversation: Conversation
  private milestoneSuggestionObservers: IResponseObserver[] = []
  private milestoneMatchRegex = /@#M#(?<milestone>[\s\S]*?)#M#(?<actions>\s*#A#[\s\S]*?#A#+)@/g
  private actionMatchRegex = /#A#(?<action>[\s\S]*?)#A#/g
  private additionalContentMatchRegex = /#E#(?<content>[\s\S]*?)#E#/g

  constructor(private currentMessage: Message, private user: User) {
  }

  addObserver(observer: IResponseObserver): void {
    this.milestoneSuggestionObservers.push(observer);
  }

  notifyObservers(data: any): void {
    for (const observer of this.milestoneSuggestionObservers) {
      observer.work(data)
    }
  }

  async preprocess(): Promise<void> {
    this.conversation = await getConversation(this.currentMessage.conversationId)
    ChatAiService.preprocess(this.user)
  }

  async summarizeSmartQuestions(): Promise<string> {
    // TODO: Move to DB/cache and load with other languages.
    const request = `Summary this conversation to support the goal: "${this.conversation.title}", concisely but enough information, with the "I" pronoun:\n###Conversation:###`

    const qa = this.conversation.smartQuestions.map((question) => {
      return `Q: ${question.content}\nA: ${question.answer}`
    }).join('\n\n')

    const prompt = `${request}\n${qa}`
    return await ChatAiService.query<string>(prompt)
  }

  async getResponses(): Promise<Message[]> {
    if (!this.conversation) return null

    const ackSummaryMessages = await this.buildAckSummaryMessages()

    return ackSummaryMessages
  }

  private async buildAckSummaryMessages(): Promise<Message[]> {
    const summary = await this.summarizeSmartQuestions()

    await this.updateDescription(this.conversation._id, summary)

    const i18ns = await I18nDao.getByCode(I18nDbCodeSummarizeQuestionnaires, this.user.locale)
    const messageType = MessageTypeAckSummaryQuestionnaires

    const message1 = this.buildBotMessage(i18ns[0].content, messageType)
    const message2 = this.buildBotMessage(i18ns[1].content, messageType)

    return [message1, message2]
  }

  async postprocess(): Promise<void> {
    await this.buildSuggestMilestoneAndActions()
  }

  private async buildSuggestMilestoneAndActions() {
    const prompt = `My goal: "${this.conversation.description}"
    I want you to break it down to very manageable, specific, executable, achievable milestones to check over time when each one is achieved. Make it easier to take action and harder to procrastinate. Make it enough to reach the goal after finishing all milestones. Make milestones and actions very concise, as concise as possible but enough information.
    
    ###Answer template:###
    @#M#{milestone 1}#M#
    #A#{milestone 1's action 1}#A#
    #A#{milestone 1's action 2}#A#
    #A#{milestone 1's action n}#A#@
    @#M#{milestone 2}#M#
    #A#{milestone 2's action 1}#A#
    #A#{milestone 2's action 2}#A#
    #A#{milestone 2's action n}#A#@
    @#M#{milestone n}#M#
    #A#{milestone n's action 1}#A#
    #A#{milestone n's action 2}#A#
    #A#{milestone n's action n}#A#@
    #E#{Anything else you want to say concisely}#E#
    
    ###Sample:###
    @#M#Milestone 1: Define Product Vision#M#
    #A#Clearly articulate the problem your software product aims to solve.#A#
    #A#Identify the target audience and understand their needs and pain points.#A#
    #A#Visualize the positive impact your product will have on users' lives.#A#@
    @#M#Milestone 2: Build a Cross-Functional Team#M#
    #A#Identify and recruit team members with complementary skills in development, marketing, and business.#A#
    #A#Define roles and responsibilities for each team member to ensure smooth collaboration.#A#
    #A#Establish effective communication channels to foster teamwork and shared vision.#A#@
    #E#Remember, changing the world requires persistence, adaptability, and a strong belief in your product's potential. Stay committed to your vision, seek feedback from users, and continuously iterate to improve your software product. Surround yourself with a supportive team and leverage their expertise. Your determination and dedication will pave the way for a product that positively impacts people's lives. Good luck on your journey to create meaningful change!#E#`

    const stream = await ChatAiService.query<Readable>(prompt, true)

    let aiResponse = ''

    stream.on('data', (data => {
      try {
        const lines = data.toString().split('\n').filter((line: string) => line.trim() !== '')
        for (const line of lines) {
          const chunk = line.toString().replace(/^data: /, '')

          const isEnd = chunk === '[DONE]'
          if (isEnd) {
            this.parseAdditionalContent(aiResponse)
          } else {
            const parsedObj = JSON.parse(chunk)
            aiResponse += parsedObj.choices[0].delta?.content || ''
          }

          this.milestoneMatchRegex.lastIndex = 0
          const isMilestoneAvailable = this.milestoneMatchRegex.test(aiResponse)
          if (isMilestoneAvailable) {
            this.parseMilestoneSuggestion(aiResponse)

            aiResponse = ''
          }
        }
      } catch (error) {
        logger.error('fetch milestone suggestion failed: ', error)
      }
    }).bind(this))
  }

  private parseMilestoneSuggestion(aiResponse: string) {
    this.milestoneMatchRegex.lastIndex = 0
    let milestoneMatch: RegExpExecArray
    while ((milestoneMatch = this.milestoneMatchRegex.exec(aiResponse)) != null) {
      const milestone = milestoneMatch.groups?.milestone.trim()

      let actions = [], actionsMatch: RegExpExecArray
      while ((actionsMatch = this.actionMatchRegex.exec(milestoneMatch.groups?.actions)) != null) {
        const action = actionsMatch.groups?.action?.trim()
        action && actions.push(action)
      }

      const milestoneSuggestion: MilestoneSuggestion = { milestone, actions }

      this.notifyObservers(milestoneSuggestion)
    }
  }

  private parseAdditionalContent(aiResponse: string) {
    let additionalContentMatch: RegExpExecArray
    this.additionalContentMatchRegex.lastIndex = 0
    while ((additionalContentMatch = this.additionalContentMatchRegex.exec(aiResponse))) {
      updateConversationById(this.currentMessage.conversationId, {
        $set: {
          'milestoneSuggestions.additionalContent': additionalContentMatch.groups?.content.trim()
        }
      })
    }
  }

  private async updateDescription(conversationId: ObjectId, description: string) {
    this.conversation.description = description

    // TODO: Consider data consistency.
    await UsersDao.updateOne({
      _id: this.user._id,
      email: this.user.email,
      'conversations._id': conversationId
    }, {
      $set: {
        'conversations.$.description': description
      }
    })

    await ConversationsDao.updateById(conversationId, {
      $set: {
        description: description,
      }
    }
    )
  }

  private buildBotMessage(messageContent: string, messageType: MessageType): Message {
    return {
      authorId: BotUserId,
      authorName: BotUserName,
      content: messageContent,
      conversationId: this.currentMessage.conversationId,
      type: messageType,
      timestamp: new Date(),
    }
  }
}

export class NextMilestoneAndActionsResponse implements IResponse {
  private milestoneIdToSuggest: ObjectId
  constructor(private currentMessage: Message, private user: User) { }

  addObserver(observer: IResponseObserver): void { }

  async preprocess(): Promise<void> {
  }

  async getResponses(): Promise<Message[]> {
    const conversation = await getConversation(this.currentMessage.conversationId)
    if (!conversation) return null

    const milestoneToSuggest = conversation.milestoneSuggestions.milestones.find(m => !m.isSuggested)

    let messageContent: string, messageType: number
    if (!milestoneToSuggest) {
      messageContent = conversation.milestoneSuggestions.additionalContent
      messageType = MessageTypePlainText
    } else {
      logger.debug('milestoneToSuggest._id: ', typeof milestoneToSuggest._id)
      this.milestoneIdToSuggest = milestoneToSuggest._id
      messageType = MessageTypeSuggestMilestoneAndActions
      messageContent = JSON.stringify(milestoneToSuggest)
    }

    const message: Message = {
      authorId: BotUserId,
      authorName: BotUserName,
      content: messageContent,
      conversationId: this.currentMessage.conversationId,
      type: messageType,
      timestamp: new Date(),
    }

    return [message]
  }

  async postprocess(): Promise<void> {
    if (!this.milestoneIdToSuggest) return

    await updateSuggestedMilestone(this.currentMessage.conversationId, this.milestoneIdToSuggest)
  }
}
