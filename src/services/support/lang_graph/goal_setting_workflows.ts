import { StateGraph, START, END, CompiledStateGraph, LastValue, Messages, StateDefinition, UpdateType, Annotation, MessagesAnnotation } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { User } from '@/entities/User';
import { goalSettingCategoryQuestionsTemplate, goalSettingCategoryQuestionsInstruction, systemMessageShort, userInformationPrompt } from './prompts';
import logger from '@/common/logger';
import { getModel, ModelNameChatGPT4o } from './model_repo';
import { GoalSettingCategoryQuestion } from '@/common/types/shared';
import { extractJsonFromMessage } from '@/common/utils/stringUtils';

export class GoalSettingCategoryQuestionsWorkflow {
  private graph: CompiledStateGraph<GoalSettingCategoryQuestionsState, UpdateType<GoalSettingStateType>, NodeType, GoalSettingStateType, GoalSettingStateType, StateDefinition>;
  private modelName: string;

  constructor() {
    const builder = new StateGraph(GoalSettingCategoryQuestionsAnnotation)
      .addNode('determineCategoryQuestions', this.determineCategoryQuestions.bind(this))
      .addEdge(START, 'determineCategoryQuestions')
      .addEdge('determineCategoryQuestions', END)

    this.graph = builder.compile()
    this.modelName = ModelNameChatGPT4o
  }

  private async determineCategoryQuestions(state: GoalSettingCategoryQuestionsState): Promise<NodeOutput> {
    const prompt = await ChatPromptTemplate.fromMessages([
      ["system", systemMessageShort],
      ["human", goalSettingCategoryQuestionsTemplate],
    ]).formatMessages({
      user_info: userInformationPrompt(state.userInfo),
      longTermMemory: state.userInfo.aiMemory,
      instructions: goalSettingCategoryQuestionsInstruction,
    })

    const result = await getModel(this.modelName).invoke(prompt)

    return {
      questions: extractJsonFromMessage<GoalSettingCategoryQuestion[]>(result.content as string),
    }
  }

  async runWorkflow(initialState: Partial<GoalSettingCategoryQuestionsState> = {}): Promise<{ result: GoalSettingCategoryQuestionsState | null, error: Error | null }> {
    if (!initialState.userInfo) {
      throw new Error('User info is required')
    }

    try {
      const finalState: GoalSettingCategoryQuestionsState = await this.graph.invoke(initialState);
      return { result: finalState, error: null };
    } catch (error) {
      logger.error(`Error running workflow: ${error}`);
      return { result: null, error: error };
    }
  }
}

type GoalSettingCategoryQuestionsState = {
  userInfo: User
  questions: Array<GoalSettingCategoryQuestion>
  messages: BaseMessage[]
}

type NodeType = typeof START | 'determineCategoryQuestions'

type GoalSettingStateType = {
  userInfo: LastValue<User>
  questions: LastValue<Array<{
    question: string
    options: string[]
  }>>
  messages: LastValue<Messages>
}

type NodeOutput = Partial<GoalSettingCategoryQuestionsState>

const GoalSettingCategoryQuestionsAnnotation = Annotation.Root({
  userInfo: Annotation<User>(),
  questions: Annotation<Array<{
    question: string
    options: string[]
  }>>(),
  ...MessagesAnnotation.spec,
})
