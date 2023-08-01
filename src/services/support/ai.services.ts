import { AiModeChat, AiModeCompletion, AiProviderOpenAi } from '@/common/consts'
import logger from '@/common/logger'
import { User } from '@/models/User'
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai'

const AiProviders = [AiProviderOpenAi]

type AiProvider = typeof AiProviders[number]

export type AiModelInfo = {
  name: string
}

export interface IAiService {
  query<T>(user: User, prompt: string, isReturnStream?: boolean): Promise<T>
}

export class OpenAiCompletionService implements IAiService {
  client: OpenAIApi
  modelInfo: AiModelInfo

  constructor(modelInfo: AiModelInfo) {
    this.client = new OpenAIApi(new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    }))

    this.modelInfo = modelInfo
  }

  private buildUserInfoTemplate(user: User): string {
    if (!user.preferences) return ""

    const { userCategory, age, gender, workerType, occupation, degree, studyCourse } = user.preferences

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

  async query<T>(user: User, prompt: string): Promise<T> {
    const userInfo = this.buildUserInfoTemplate(user)
    logger.debug('prompt: ' + prompt)

    const response = await this.client.createCompletion({
      model: this.modelInfo.name,
      prompt: `Your name is Lava, you are a member of product named Lazyvax that helps people achieve their goals better.
      You act like an expert in goal setting and goal execution, a motivational coach, helping people to break in down better, clearer, achieve their goal better. I will provide you with some information about someone's goals and challenges, and it will be your job to come up with strategies that can help this person achieve their goals. This could involve providing positive affirmations, giving helpful advice or suggesting activities they can do to reach their end goal. Put together words that inspire action and make people feel empowered to do something beyond their abilities.
      You are humorous, you give funny answers.
      ${userInfo}

      ${prompt}
      `,
      temperature: 0,
      max_tokens: 2000,
      top_p: 1,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    })

    logger.debug('response: ' + response.data.choices[0].text)
    return response.data.choices[0].text as T
  }
}

export class OpenAiChatService implements IAiService {
  client: OpenAIApi
  modelInfo: AiModelInfo
  user: User
  systemMessage: ChatCompletionRequestMessage

  private buildUserInfoTemplate(user: User): string {
    if (!user.preferences) return ""

    const { userCategory, age, gender, workerType, occupation, degree, studyCourse } = user.preferences

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

  private buildSystemMessage(user: User) {
    const userInfo = this.buildUserInfoTemplate(user)

    this.systemMessage = {
      content: `Your name is Lava, you are a member of product named Lazyvax that helps people achieve their goals better. You act like an expert in goal setting and goal execution, a motivational coach, helping people to break in down better, clearer, achieve their goal better. I will provide you with some information about someone's goals and challenges, and it will be your job to come up with strategies that can help this person achieve their goals. This could involve providing positive affirmations, giving helpful advice or suggesting activities they can do to reach their end goal. Put together words that inspire action and make people feel empowered to do something beyond their abilities.
      ${userInfo}`,
      role: 'system',
    }
  }

  constructor(modelInfo: AiModelInfo) {
    this.client = new OpenAIApi(new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    }))

    this.modelInfo = modelInfo
  }

  async query<T>(user: User, prompt: string, isReturnStream: boolean = false): Promise<T> {
    logger.debug('prompt: ' + prompt)

    this.buildSystemMessage(user)
    const response: any = await this.client.createChatCompletion({
      model: this.modelInfo.name,
      messages: [
        this.systemMessage,
        {
          content: prompt,
          role: 'user',
          name: this.user._id.toHexString(),
        }
      ],
      temperature: 0,
      max_tokens: 1000,
      top_p: 1,
      frequency_penalty: 0.2,
      presence_penalty: 0.0,
      stream: isReturnStream,
    }, { responseType: isReturnStream ? 'stream' : 'json' })

    if (isReturnStream) {
      return response.data as T
    }

    logger.debug('response: ' + response.data.choices[0].message.content)
    return response.data.choices[0].message.content as T
  }
}

export class AiServiceFactory {
  createAiService(provider: AiProvider, mode: string, modelInfo: AiModelInfo): IAiService {
    switch (provider) {
      case AiProviderOpenAi:
        switch (mode) {
          case AiModeCompletion:
            return new OpenAiCompletionService(modelInfo)

          case AiModeChat:
            return new OpenAiChatService(modelInfo)

          default:
            return new OpenAiCompletionService(modelInfo)
        }


      default:
        return new OpenAiCompletionService(modelInfo)
    }
  }
}

export let CompletionAiService: IAiService
export let ChatAiService: IAiService

export function registerAiServices(provider: AiProvider): void {
  const factory = new AiServiceFactory()
  CompletionAiService = factory.createAiService(provider, AiModeCompletion, { name: 'text-davinci-003' })
  ChatAiService = factory.createAiService(provider, AiModeChat, { name: 'gpt-3.5-turbo' })
}
