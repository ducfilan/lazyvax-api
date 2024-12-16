import { Env, Envs } from "@/common/consts/constants";
import logger from "@/common/logger";
import { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { AIMessageChunk } from "@langchain/core/messages";
import { RunnableWithFallbacks } from "@langchain/core/runnables";

export const ModelNameChatGPT4oMini = "gpt-4o-mini"
export const ModelNameChatGPT4oMiniYescale = "gpt-4o-mini-yescale"
export const ModelNameChatGPT4o = "gpt-4o"
export const ModelNameChatGPT4oYescale = "gpt-4o-yescale"
export const ModelNameClaude35Sonnet = "claude-3-5-sonnet"
export const ModelNameClaude35Haiku = "claude-3-5-haiku"
export const ModelNameLlama3370BInstruct = "meta-llama/Llama-3.3-70B-Instruct"

const DefaultModelName = ModelNameChatGPT4oMini

const gpt4oMiniModel = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.6,
  cache: true,
  maxRetries: 1,
  verbose: Env === Envs.dev,
})

const gpt4oModel = new ChatOpenAI({
  modelName: 'gpt-4o',
  temperature: 0.6,
  cache: true,
  maxRetries: 1,
  verbose: Env === Envs.dev,
})

const gpt4oMiniYescaleModel = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.6,
  cache: true,
  maxRetries: 0,
  verbose: Env === Envs.dev,
  configuration: {
    baseURL: "https://api.yescale.io/v1",
    apiKey: process.env.YESCALE_API_KEY
  }
})

const gpt4oYescaleModel = new ChatOpenAI({
  modelName: 'gpt-4o',
  temperature: 0.6,
  cache: true,
  maxRetries: 0,
  verbose: Env === Envs.dev,
  configuration: {
    baseURL: "https://api.yescale.io/v1",
    apiKey: process.env.YESCALE_API_KEY
  }
})

const claude35SonnetModel = new ChatAnthropic({
  modelName: 'claude-3-5-sonnet',
  temperature: 0.6,
  cache: true,
  maxRetries: 1,
  verbose: Env === Envs.dev,
})

const claude35HaikuModel = new ChatAnthropic({
  modelName: 'claude-3-5-haiku',
  temperature: 0.6,
  cache: true,
  maxRetries: 1,
  verbose: Env === Envs.dev,
})

const llama3370BInstructModel = new ChatOpenAI({
  modelName: 'meta-llama/Llama-3.3-70B-Instruct',
  temperature: 0.6,
  topP: 0.9,
  maxTokens: 4196,
  cache: true,
  verbose: Env === Envs.dev,
  maxRetries: 0,
  configuration: {
    apiKey: process.env.HYPERBOLIC_API_KEY,
    baseURL: 'https://api.hyperbolic.xyz/v1',
  }
})

const models = {
  [ModelNameChatGPT4oMini]: gpt4oMiniModel.withFallbacks([
    llama3370BInstructModel,
    claude35HaikuModel,
  ]),
  [ModelNameChatGPT4o]: gpt4oModel.withFallbacks([
    llama3370BInstructModel,
    claude35SonnetModel,
  ]),
  [ModelNameChatGPT4oMiniYescale]: gpt4oMiniYescaleModel.withFallbacks([
    gpt4oMiniModel,
    llama3370BInstructModel,
    claude35HaikuModel,
  ]),
  [ModelNameChatGPT4oYescale]: gpt4oYescaleModel.withFallbacks([
    gpt4oModel,
    llama3370BInstructModel,
    claude35SonnetModel,
  ]),
  [ModelNameClaude35Sonnet]: claude35SonnetModel.withFallbacks([
    gpt4oModel,
    llama3370BInstructModel,
    claude35HaikuModel,
  ]),
  [ModelNameLlama3370BInstruct]: llama3370BInstructModel.withFallbacks([
    gpt4oModel,
    claude35HaikuModel,
  ]),
}

export function getModel(targetModelName: string): RunnableWithFallbacks<BaseLanguageModelInput, AIMessageChunk> {
  switch (targetModelName) {
    case ModelNameChatGPT4oMini:
      return Env === Envs.dev ? models[ModelNameChatGPT4oMiniYescale] : models[ModelNameChatGPT4oMini]

    case ModelNameChatGPT4o:
      return Env === Envs.dev ? models[ModelNameChatGPT4oYescale] : models[ModelNameChatGPT4o]

    case ModelNameLlama3370BInstruct:
      return models[ModelNameLlama3370BInstruct]

    default:
      logger.info("unsupported model name: " + targetModelName)
      return models[DefaultModelName]
  }
}
