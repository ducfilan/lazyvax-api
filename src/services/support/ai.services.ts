import { AiProviderOpenAi } from '@/common/consts'
import { Configuration, OpenAIApi } from 'openai'

const AiProviders = [AiProviderOpenAi]

type AiProvider = typeof AiProviders[number]

export type AiModelInfo = {
  name: string
}

export interface IAiServices {
  query(prompt: string): Promise<string>
}

export class OpenAiServices implements IAiServices {
  client: OpenAIApi
  modelInfo: AiModelInfo

  constructor(modelInfo: AiModelInfo) {
    this.client = new OpenAIApi(new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    }))

    this.modelInfo = modelInfo
  }

  async query(prompt: string): Promise<string> {
    const response = await this.client.createCompletion({
      model: this.modelInfo.name,
      prompt,
      temperature: 0,
      max_tokens: 2000,
      top_p: 1,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    })

    return response.data.choices[0].text
  }
}

export class AiServiceFactory {
  createAiService(provider: AiProvider, modelInfo: AiModelInfo): IAiServices {
    switch (provider) {
      case AiProviderOpenAi:
        return new OpenAiServices(modelInfo)

      default:
        return new OpenAiServices(modelInfo)
    }
  }
}

export let AiServices: IAiServices

export function registerAiServices(provider: AiProvider, modelInfo: AiModelInfo): void {
  AiServices = new AiServiceFactory().createAiService(provider, modelInfo)
}
