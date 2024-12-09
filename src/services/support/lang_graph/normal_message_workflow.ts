import { StateGraph, START, END, CompiledStateGraph, LastValue, Messages, StateDefinition, UpdateType, Annotation, MessagesAnnotation } from '@langchain/langgraph';
import { AIMessage, AIMessageChunk, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { User } from '@/entities/User';
import { ObjectId } from 'mongodb';
import { Runnable } from '@langchain/core/runnables';
import logger from '@/common/logger';
import { Conversation } from '@/entities/Conversation';
import { getModel, ModelNameChatGPT4oMini } from './model_repo';
import { generalMessageInstruction, generalMessageTemplate, summarizeConversationConditionPrompt, systemMessageShort } from './prompts';
import { userInformationPrompt } from './prompts';
import { MessageTypePlainText } from '@/common/consts/message-types';
import { sendMessage } from '@/services/utils/conversation.utils';
import { getConversationById } from '@/services/api/conversations.services';
import { getConversationLastMessages } from '@/services/api/messages.services';
import { BotUserIds } from '@/common/consts/constants';
import {
  checkMessageIntentStep,
  handlePlanningMessageStep,
  handleGeneralMessageStep,
  summarizeConversationStep,
  NormalMessageSteps,
  ConversationTypeWeek
} from '@/common/consts/shared';
import { ChatOpenAI, ChatOpenAICallOptions } from '@langchain/openai';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { formatDateToStringInTimeZone, getDayIndexFromDateInTimeZone } from '@/common/utils/dateUtils';
import { extractJsonFromMessage } from '@/common/utils/stringUtils';
import { GeneralMessageMemory, GeneralMessageResponse } from '@/common/types/types';
import { saveMemorizeInfo } from './utils';
import { createConversationMemory, getConversationMemoryByConversationId } from '@/services/api/conversation_memories.services';
import { ConversationMemory } from '@/entities/ConversationMemory';

export class NormalMessageWorkflow {
  private graph: CompiledStateGraph<NormalMessageState, UpdateType<NormalMessageStateType>, NodeType, NormalMessageStateType, NormalMessageStateType, StateDefinition>;
  private model: Runnable<BaseLanguageModelInput, AIMessageChunk, ChatOpenAICallOptions>;

  constructor() {
    const builder = new StateGraph(NormalMessageAnnotation)
      // Add nodes
      .addNode(checkMessageIntentStep, this.checkMessageIntent.bind(this))
      .addNode(handlePlanningMessageStep, this.handlePlanningMessage.bind(this))
      .addNode(handleGeneralMessageStep, this.handleGeneralMessage.bind(this))
      .addNode(summarizeConversationStep, this.summarizeConversation.bind(this))
      // Add edges
      .addConditionalEdges(START, this.decideStartFlow)
      .addConditionalEdges(handlePlanningMessageStep, this.decideNeedsSummary)
      .addConditionalEdges(handleGeneralMessageStep, this.decideNeedsSummary)
      .addEdge(summarizeConversationStep, END)

    this.graph = builder.compile()
    this.model = (getModel(ModelNameChatGPT4oMini) as ChatOpenAI).bindTools([])
  }

  private async checkMessageIntent(state: NormalMessageState): Promise<NodeOutput> {
    logger.debug('checkMessageIntent')
    const isPlanningRelated = false;

    return {
      isPlanningRelated,
      intentChecked: true,
    }
  }

  private async handlePlanningMessage(state: NormalMessageState): Promise<NodeOutput> {
    logger.debug('handlePlanningMessage')
    return {}
  }

  private async handleGeneralMessage(state: NormalMessageState): Promise<NodeOutput> {
    logger.debug('handleGeneralMessage')

    const { conversationId, summary, messages: stateMessages } = state;
    const messages = summary?.length > 0
      ? [new SystemMessage({ content: `Summary of conversation earlier: ${summary}` }), ...stateMessages]
      : stateMessages;

    const prompt = await ChatPromptTemplate.fromMessages([
      ["system", `${systemMessageShort}\n\n${userInformationPrompt(state.userInfo)}`],
      new MessagesPlaceholder("messages"),
      ["human", generalMessageTemplate],
    ]).formatMessages({
      user_info: userInformationPrompt(state.userInfo),
      messages,
      now: formatDateToStringInTimeZone(new Date(), state.userInfo.preferences?.timezone),
      user_message: state.lastMessage,
      instructions: generalMessageInstruction
    })

    const response = await getModel(ModelNameChatGPT4oMini).invoke(prompt)
    const parsedResponse = extractJsonFromMessage<GeneralMessageResponse>(response.content)
    const { response: responseMessage, memorize, memorizeInfo } = parsedResponse
    await sendMessage(conversationId, responseMessage, MessageTypePlainText)

    if (memorize && state.conversationMemory) {
      const dayIndex = getDayIndexFromDateInTimeZone(new Date(), state.userInfo.preferences?.timezone)

      const currentMemory: GeneralMessageMemory = {
        longTermMemory: state.userInfo.aiMemory || '',
        weeklyMemory: state.conversationMemory.meta.weekAiMemory || '',
        dailyMemory: state.conversationMemory.meta.dayAiMemory[dayIndex] || '',
      }

      const updatedMemory = await saveMemorizeInfo(state.userInfo, dayIndex, currentMemory, memorizeInfo)
      state.userInfo.aiMemory = updatedMemory.longTermMemory
      state.conversationMemory.meta.weekAiMemory = updatedMemory.weeklyMemory
      state.conversationMemory.meta.dayAiMemory[dayIndex] = updatedMemory.dailyMemory
    }

    return {
      messages: [...messages, response],
    }
  }

  private async summarizeConversation(state: NormalMessageState): Promise<NodeOutput> {
    logger.debug('summarizeConversation')

    const { summary, messages } = state;
    let summaryMessage: string;

    if (summary) {
      summaryMessage = `This is summary of the conversation to date: ${summary}\n\n` +
        `Extend the summary by taking into account the new messages above ${summarizeConversationConditionPrompt}:`;
    } else {
      summaryMessage = `Summarize the conversation ${summarizeConversationConditionPrompt}`;
    }

    const allMessages = [...messages, new HumanMessage({
      content: summaryMessage,
    })];

    const response = await getModel(ModelNameChatGPT4oMini).invoke(allMessages)

    if (typeof response.content !== "string") {
      throw new Error("Expected a string response from the model");
    }

    return {
      summary: response.content,
      messages: messages.slice(-4),
    }
  }

  private decideStartFlow(state: NormalMessageState) {
    if (!state.intentChecked) return checkMessageIntentStep
    return state.isPlanningRelated ? handlePlanningMessageStep : handleGeneralMessageStep
  }

  private decideNeedsSummary(state: NormalMessageState) {
    const needsSummary = state.messages.length >= 5 && (!state.summary || state.messages.length % 10 === 0)
    return needsSummary ? summarizeConversationStep : END
  }

  async runWorkflow(initialState: Partial<NormalMessageState> = {}) {
    if (!initialState.userInfo || !initialState.conversationId) {
      throw new Error('User info and conversation ID are required')
    }

    const conversationMemory = await getConversationMemoryByConversationId(initialState.conversationId)
    if (!conversationMemory) {
      await createConversationMemory(initialState.conversationId, ConversationTypeWeek)
    }

    initialState.conversation = await getConversationById(initialState.conversationId)
    initialState.conversationMemory = conversationMemory
    initialState.summary = initialState.conversation?.summary
    const lastMessages = (await getConversationLastMessages(initialState.conversationId))
      .map(m => BotUserIds[m.authorId.toHexString()] ? new AIMessage(m.content) : new HumanMessage(m.content))

    initialState.messages = lastMessages

    try {
      const finalState = await this.graph.invoke(initialState)
      return finalState
    } catch (error) {
      logger.error(`Error running workflow: ${error}`)
    }
  }
}

type NormalMessageState = {
  userInfo: User
  conversationId: ObjectId
  conversation: Conversation | null
  conversationMemory: ConversationMemory | null
  intentChecked: boolean
  isPlanningRelated: boolean
  messages: BaseMessage[]
  summary: string | null
  lastMessage: BaseMessage
}

type NodeType = typeof START | keyof typeof NormalMessageSteps

type NormalMessageStateType = {
  userInfo: LastValue<User>
  conversationId: LastValue<ObjectId>
  conversation: LastValue<Conversation | null>
  conversationMemory: LastValue<ConversationMemory | null>
  intentChecked: LastValue<boolean>
  isPlanningRelated: LastValue<boolean>
  messages: LastValue<Messages>
  summary: LastValue<string | null>
  lastMessage: LastValue<BaseMessage | null>
}

type NodeOutput = Partial<NormalMessageState>

const NormalMessageAnnotation = Annotation.Root({
  userInfo: Annotation<User>(),
  conversationId: Annotation<ObjectId>(),
  conversation: Annotation<Conversation | null>(),
  conversationMemory: Annotation<ConversationMemory | null>(),
  intentChecked: Annotation<boolean>(),
  isPlanningRelated: Annotation<boolean>(),
  summary: Annotation<string | null>(),
  lastMessage: Annotation<BaseMessage | null>(),
  ...MessagesAnnotation.spec,
})
