import { Configuration, OpenAIApi } from 'openai'

const AiProviderOpenAi = 'openai'
const AiProviders = [AiProviderOpenAi]

type AiProvider = typeof AiProviders[number]

export interface AiServices {
  query(prompt: string): Promise<string>
}

export class OpenAiServices implements AiServices {
  client: OpenAIApi

  constructor() {
    this.client = new OpenAIApi(new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    }))
  }

  async query(prompt: string): Promise<string> {
    const response = await this.client.createCompletion({
      model: 'text-davinci-003',
      prompt,
      temperature: 0,
      max_tokens: 100,
      top_p: 1,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      stop: ['\n'],
    })

    return response.data.choices[0].text
  }
}

export class AiServiceFactory {
  createAiService(provider: AiProvider): AiServices {
    switch (provider) {
      case AiProviderOpenAi:
        return new OpenAiServices()

      default:
        return new OpenAiServices()
    }
  }
}
