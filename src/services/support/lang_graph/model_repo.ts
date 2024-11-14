import logger from "@/common/logger";
import { BaseLanguageModel } from "@langchain/core/language_models/base";
import { ChatOpenAI } from "@langchain/openai";

export const ModelNameChatGPT4oMini = "gpt-4o-mini"
export const ModelNameChatGPT4o = "gpt-4o"

const DefaultModelName = ModelNameChatGPT4oMini

const models = {
  [ModelNameChatGPT4oMini]: new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.6,
    cache: true,
  }),
  [ModelNameChatGPT4o]: new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.6,
    cache: true,
  })
}

export function getModel(targetModelName: string): BaseLanguageModel {
  switch (targetModelName) {
    case ModelNameChatGPT4oMini:
      return models[ModelNameChatGPT4oMini]

    case ModelNameChatGPT4o:
      return models[ModelNameChatGPT4o]

    default:
      logger.info("unsupported model name: " + targetModelName)
      return models[DefaultModelName]
  }
}
