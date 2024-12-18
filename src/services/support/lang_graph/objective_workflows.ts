import { StateGraph, START, END, CompiledStateGraph, LastValue, Messages, StateDefinition, UpdateType, Annotation, MessagesAnnotation } from '@langchain/langgraph';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { User } from '@/entities/User';
import { RunnableConfig } from '@langchain/core/runnables';
import { goalSettingLevelTemplate, goalSettingLevelInstruction, systemMessageShort, userInformationPrompt } from './prompts';
import logger from '@/common/logger';
import { getModel, ModelNameChatGPT4o } from './model_repo';

export class GoalSettingLevelWorkflow {
  private graph: CompiledStateGraph<GoalSettingLevelState, UpdateType<GoalSettingStateType>, NodeType, GoalSettingStateType, GoalSettingStateType, StateDefinition>;
  private modelName: string;

  constructor() {
    const builder = new StateGraph(GoalSettingLevelAnnotation)
      .addNode('determineLevel', this.determineLevel.bind(this))
      .addEdge(START, 'determineLevel')
      .addEdge('determineLevel', END)

    this.graph = builder.compile()
    this.modelName = ModelNameChatGPT4o
  }

  private async determineLevel(state: GoalSettingLevelState): Promise<NodeOutput> {
    const prompt = await ChatPromptTemplate.fromMessages([
      ["system", systemMessageShort],
      ["human", goalSettingLevelTemplate],
    ]).formatMessages({
      user_info: userInformationPrompt(state.userInfo),
      longTermMemory: state.userInfo.aiMemory,
      instructions: goalSettingLevelInstruction,
    })

    const result = await getModel(this.modelName).invoke(prompt)

    return {
      questions: JSON.parse(result.content as string),
    }
  }

  async runWorkflow(initialState: Partial<GoalSettingLevelState> = {}): Promise<{ result: GoalSettingLevelState | null, error: Error | null }> {
    if (!initialState.userInfo) {
      throw new Error('User info is required')
    }

    try {
      const finalState: GoalSettingLevelState = await this.graph.invoke(initialState);
      return { result: finalState, error: null };
    } catch (error) {
      logger.error(`Error running workflow: ${error}`);
      return { result: null, error: error };
    }
  }
}

type GoalSettingLevelState = {
  userInfo: User
  questions: Array<{
    question: string
    options: string[]
  }>
  messages: BaseMessage[]
}

type NodeType = typeof START | 'determineLevel'

type GoalSettingStateType = {
  userInfo: LastValue<User>
  questions: LastValue<Array<{
    question: string
    options: string[]
  }>>
  messages: LastValue<Messages>
}

type NodeOutput = Partial<GoalSettingLevelState>

const GoalSettingLevelAnnotation = Annotation.Root({
  userInfo: Annotation<User>(),
  questions: Annotation<Array<{
    question: string
    options: string[]
  }>>(),
  ...MessagesAnnotation.spec,
})
