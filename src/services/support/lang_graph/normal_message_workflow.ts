import { StateGraph, START, END, CompiledStateGraph, LastValue, Messages, StateDefinition, UpdateType, Annotation, MessagesAnnotation } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { User } from '@/entities/User';
import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
import { DatabaseName, getDbClient } from '@/common/configs/mongodb-client.config';
import { ObjectId } from 'mongodb';
import { RunnableConfig } from '@langchain/core/runnables';
import logger from '@/common/logger';
import { Conversation } from '@/entities/Conversation';
import { getModel, ModelNameChatGPT4oMini } from './model_repo';
import { summarizeConversationConditionPrompt, systemMessageShort } from './prompts';
import { userInformationPrompt } from './prompts';
import { MessageTypePlainText } from '@/common/consts/message-types';
import { sendMessage } from '@/services/utils/conversation.utils';

export class NormalMessageWorkflow {
  private checkpointer: MongoDBSaver;
  private graph: CompiledStateGraph<NormalMessageState, UpdateType<NormalMessageStateType>, NodeType, NormalMessageStateType, NormalMessageStateType, StateDefinition>;

  constructor() {
    this.checkpointer = new MongoDBSaver({ client: getDbClient(), dbName: DatabaseName })

    const builder = new StateGraph(NormalMessageAnnotation)
      // Add nodes
      .addNode('checkMessageIntent', this.checkMessageIntent.bind(this))
      .addNode('handlePlanningMessage', this.handlePlanningMessage.bind(this))
      .addNode('handleGeneralMessage', this.handleGeneralMessage.bind(this))
      .addNode('summarizeConversation', this.summarizeConversation.bind(this))
      // Add edges
      .addConditionalEdges(START, this.decideStartFlow)
      .addConditionalEdges('handlePlanningMessage', this.decideNeedsSummary)
      .addConditionalEdges('handleGeneralMessage', this.decideNeedsSummary)
      .addEdge('summarizeConversation', END)

    this.graph = builder.compile({ checkpointer: this.checkpointer })
  }

  private async checkMessageIntent(state: NormalMessageState): Promise<NodeOutput> {
    logger.debug('checkMessageIntent')
    // TODO: Add tool calling logic to determine message intent
    const isPlanningRelated = false // Replace with actual tool call

    return {
      isPlanningRelated,
      intentChecked: true
    }
  }

  private async handlePlanningMessage(state: NormalMessageState): Promise<NodeOutput> {
    logger.debug('handlePlanningMessage')
    // TODO: Add planning-specific logic
    return {
      responseGenerated: true
    }
  }

  private async handleGeneralMessage(state: NormalMessageState): Promise<NodeOutput> {
    logger.debug('handleGeneralMessage')

    const { conversationId, summary, messages: stateMessages } = state;
    const messages = summary
      ? [new SystemMessage({ content: `Summary of conversation earlier: ${summary}` }), ...stateMessages]
      : stateMessages;

    const prompt = await ChatPromptTemplate.fromMessages([
      ["system", `${systemMessageShort}\n${userInformationPrompt(state.userInfo)}`],
      new MessagesPlaceholder("messages"),
    ]).formatMessages({
      user_info: userInformationPrompt(state.userInfo),
      messages
    })

    const response = await getModel(ModelNameChatGPT4oMini).invoke(prompt)
    await sendMessage(conversationId, response.content, MessageTypePlainText)

    return {
      responseGenerated: true,
      messages: [...messages, response]
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
      // Keep only last 4 messages in state
      messages: messages.slice(-4)
    }
  }

  private decideStartFlow(state: NormalMessageState) {
    if (!state.intentChecked) return 'checkMessageIntent'
    return state.isPlanningRelated ? 'handlePlanningMessage' : 'handleGeneralMessage'
  }

  private decideNeedsSummary(state: NormalMessageState) {
    // Decide if we need to update the summary based on various factors:
    // 1. Number of messages since last summary
    // 2. Significant topic changes
    // 3. Time elapsed
    // etc.

    const needsSummary = state.messages.length >= 5 && (!state.summary || state.messages.length % 10 === 0)
    return needsSummary ? 'summarizeConversation' : END
  }

  async runWorkflow(initialState: Partial<NormalMessageState> = {}) {
    if (!initialState.userInfo || !initialState.conversationId) {
      throw new Error('User info and conversation ID are required')
    }

    const config: RunnableConfig = {
      configurable: { thread_id: `normal_message_${initialState.conversationId.toHexString()}` }
    }

    const lastState = (await this.checkpointer.get(config))?.channel_values ?? {}

    try {
      const finalState = await this.graph.invoke({ ...lastState, ...initialState }, config);
      return finalState;
    } catch (error) {
      logger.error(`Error running workflow: ${error}`);
    }
  }
}

type NormalMessageState = {
  userInfo: User
  conversationId: ObjectId
  conversation: Conversation | null
  intentChecked: boolean
  isPlanningRelated: boolean
  responseGenerated: boolean
  messages: BaseMessage[]
  summary: string | null
}

type NodeType = typeof START | 'checkMessageIntent' | 'handlePlanningMessage' | 'handleGeneralMessage' | 'summarizeConversation'

type NormalMessageStateType = {
  userInfo: LastValue<User>
  conversationId: LastValue<ObjectId>
  conversation: LastValue<Conversation | null>
  intentChecked: LastValue<boolean>
  isPlanningRelated: LastValue<boolean>
  responseGenerated: LastValue<boolean>
  messages: LastValue<Messages>
  summary: LastValue<string | null>
}

type NodeOutput = Partial<NormalMessageState>

const NormalMessageAnnotation = Annotation.Root({
  userInfo: Annotation<User>(),
  conversationId: Annotation<ObjectId>(),
  conversation: Annotation<Conversation | null>(),
  intentChecked: Annotation<boolean>(),
  isPlanningRelated: Annotation<boolean>(),
  responseGenerated: Annotation<boolean>(),
  summary: Annotation<string | null>(),
  ...MessagesAnnotation.spec,
})
