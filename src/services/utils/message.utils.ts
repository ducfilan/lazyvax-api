import { BotUserId, BotUserName, MessageTypeAskUser, MessageTypeStateGoal } from "@/common/consts"
import { Message } from "@/models/Message"
import { AiServices } from "../support/ai.services"
import ConversationsDao from "@/dao/conversations.dao"
import { saveMessage } from "../api/messages.services"
import { User } from "@/models/User"

type AnswerType =
  | "text"
  | "number"
  | "date"
  | "selection"

interface Question {
  content: string;
  answerType: AnswerType;
  unit?: string; // example: "days"
  selection?: { type: "single" | "multiple", options: string[] }
}

export interface IResponse {
  preprocess(): Promise<void>
  getResponse(): Promise<Message>
}

export class StateGoalResponse implements IResponse {
  private prompt: string
  private smartQuestions: Question[]

  constructor(private currentMessage: Message, private user: User) {
    this.prompt = this.buildPrompt()
    this.smartQuestions = []
  }

  private buildUserInfoTemplate(): string {
    if (!this.user.preferences) return ""

    const { userCategory, age, gender, workerType, occupation, degree, studyCourse } = this.user.preferences

    const commonInfo = `You are talking with a ${userCategory}, ${gender}, in ${age} years old`
    const professionalInfo = `working as ${workerType == "both" ? "both individual and manager" : workerType} in the organization, in the field "${occupation}"`
    const studentInfo = `studying the ${degree} degree of ${studyCourse} field`

    switch (userCategory) {
      case "professional":
        return `${commonInfo}, ${professionalInfo}.`

      case "student":
        return `${commonInfo}, ${studentInfo}.`

      default:
        return ''
    }
  }

  private buildPrompt(): string {
    const userInfo = this.buildUserInfoTemplate()
    const request = 'Give me questions for me to answer to make this goal S.M.A.R.T. Give me enough question so that after answer those questions, the goal should be S.M.A.R.T.'
    const answerPrefs = 'Add the answer type, like "date", "number", "text", "selection". If it is "selection", output selection options in this format: [single or multiple]-[option 1||option 2||option n] (specify those options). If it is "number", output the measurement unit next to number if possible, e.g. "number" (days).'
    const goal = `###Goal:### "${this.currentMessage.content}"`
    const answerFormat = `"#Q#{question}?#Q# - #A#{answer type}::{type properties}#A#"\nExample:\n#Q#What is this?#Q# - #A#text::#A#\n#Q#How old are you?#Q# - #A#number::#A#\n#Q#How many days?#Q# - #A#number::(days)#A#\n#Q#What’s your level?#Q# - #A#selection::[single]-[Beginner||Intermediate||Advanced]#A#\n#Q#What do you like?#Q# - #A#selection::[multiple]-[A||B||C||D]#A#`

    return `${userInfo}\n\n${request}\n\n${answerPrefs}\n\n${goal}\n\n${answerFormat}`
  }

  private parseAiResponse(response: string) {
    const regex = /#Q#(.*?)#Q#\s-\s#A#(.*?)::(.*?)?#A#/g;

    let questionMatch;
    while ((questionMatch = regex.exec(response))) {
      const question: Question = {
        content: questionMatch[1],
        answerType: questionMatch[2] || "text",
      }

      const properties = questionMatch[3]
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

      this.smartQuestions.push(question)
    }
  }

  async preprocess(): Promise<void> {
    try {
      const aiResponse = await AiServices.query(this.prompt)
      this.parseAiResponse(aiResponse)
      ConversationsDao.updateOne(this.currentMessage.conversationId, { $set: { smartQuestions: this.smartQuestions } })

    } catch (error) {
      // TODO: Handle the error.
      console.error(error)
    }
  }

  async getResponse(): Promise<Message> {
    const firstQuestion = this.smartQuestions[0]
    const responseMessage: Message = {
      authorId: BotUserId,
      authorName: BotUserName,
      content: firstQuestion.content,
      conversationId: this.currentMessage.conversationId,
      type: MessageTypeAskUser,
      timestamp: new Date(),
      parentId: this.currentMessage._id,
      parentContent: this.currentMessage.content,
    }

    const messageId = await saveMessage(responseMessage)
    responseMessage._id = messageId

    return responseMessage
  }
}

export class EmptyResponse implements IResponse {
  async preprocess(): Promise<void> { }

  async getResponse(): Promise<Message> {
    return null
  }
}

export class BotResponseFactory {
  static createResponseBuilder(currentMessage: Message, user: User): IResponse {
    switch (currentMessage.type) {
      case MessageTypeStateGoal:
        return new StateGoalResponse(currentMessage, user)

      default:
        return new EmptyResponse()
    }
  }
}