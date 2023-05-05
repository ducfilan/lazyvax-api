import { AiModeChat, AiModeCompletion, AiProviderOpenAi } from '@/common/consts'
import { User } from '@/models/User'
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai'

const AiProviders = [AiProviderOpenAi]

type AiProvider = typeof AiProviders[number]

export type AiModelInfo = {
  name: string
}

export interface IAiService {
  preprocess(user: User): void
  query(prompt: string): Promise<string>
}

export class OpenAiCompletionService implements IAiService {
  client: OpenAIApi
  modelInfo: AiModelInfo
  user: User

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

  preprocess(user: User): void {
    this.user = user
  }

  async query(prompt: string): Promise<string> {
    const userInfo = this.buildUserInfoTemplate(this.user)

    const response = await this.client.createCompletion({
      model: this.modelInfo.name,
      prompt: `You act like an expert in goal setting, a motivational coach, helping people to achieve their goal better. I will provide you with some information about someone's goals and challenges, and it will be your job to come up with strategies that can help this person achieve their goals. This could involve providing positive affirmations, giving helpful advice or suggesting activities they can do to reach their end goal. Put together words that inspire action and make people feel empowered to do something beyond their abilities.
      ${userInfo}

      ${prompt}
      `,
      temperature: 0,
      max_tokens: 2000,
      top_p: 1,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    })

    return response.data.choices[0].text
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
      content: `You act like an expert in goal setting, a motivational coach, helping people to achieve their goal better. I will provide you with some information about someone's goals and challenges, and it will be your job to come up with strategies that can help this person achieve their goals. This could involve providing positive affirmations, giving helpful advice or suggesting activities they can do to reach their end goal. Put together words that inspire action and make people feel empowered to do something beyond their abilities.
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

  preprocess(user: User): void {
    this.user = user
    this.buildSystemMessage(user)
  }

  async query(prompt: string): Promise<string> {
    const response = await this.client.createChatCompletion({
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
    })

    return response.data.choices[0].message.content
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
          case AiModeCompletion:
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
