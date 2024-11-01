import { StateGraph, START, END, CompiledStateGraph, LastValue, Messages, StateDefinition, StateType, UpdateType } from '@langchain/langgraph';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage } from '@langchain/core/messages';
import { WeeklyPlanningAnnotation } from './annotations';
import { User } from '@/entities/User';
import { getEvents } from '@/services/api/events.services';
import { getWeekInfo } from '@/common/utils/dateUtils';
import { format } from 'date-fns';
import { WeekPlanType } from '@/common/types/types';
import { BotUserId, BotUserName, MessageTypeAskToGenerateWeekPlan, PlanTypeWeekInteractive } from '@/common/consts/constants';
import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
import { DatabaseName, getDbClient } from '@/common/configs/mongodb-client.config';
import { emitConversationMessage } from '../socket.io.service';
import { ObjectId } from 'mongodb';
import { Message } from '@/entities/Message';

export class WeeklyPlanningWorkflow {
  private model: BaseLanguageModel;
  private graph: CompiledStateGraph<StateType<WeekPlanStateType>, UpdateType<WeekPlanStateType>, NodeType, WeekPlanStateType, WeekPlanStateType, StateDefinition>;

  constructor(model?: BaseLanguageModel) {
    this.model = model || new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.6
    })

    const checkpointer = new MongoDBSaver({ client: getDbClient(), dbName: DatabaseName })

    const builder = new StateGraph(WeeklyPlanningAnnotation)
      // Add nodes.
      .addNode('checkLastWeekPlan', this.checkLastWeekPlan)
      .addNode('selectPlanType', this.selectPlanType)
      .addNode('checkRoutineAndHabits', this.checkRoutineAndHabits)
      .addNode('askForRoutine', this.askForRoutine)
      .addNode('checkMustDoTasks', this.checkMustDoTasks)
      .addNode('askForMustDoTasks', this.askForMustDoTasks)
      .addNode('generateCoreTasks', this.generateCoreTasks)
      .addNode('checkUserSatisfactionCore', this.checkUserSatisfactionCore)
      .addNode('adjustCoreTasks', this.adjustCoreTasks)
      .addNode('addCoreTasksToCalendar', this.addCoreTasksToCalendar)
      .addNode('generateUnimportantTasks', this.generateUnimportantTasks)
      .addNode('checkUserSatisfactionUnimportant', this.checkUserSatisfactionUnimportant)
      .addNode('adjustUnimportantTasks', this.adjustUnimportantTasks)
      .addNode('addUnimportantTasksToCalendar', this.addUnimportantTasksToCalendar)
      .addNode('generateMoreDays', this.generateMoreDays)
      .addNode('motivateUser', this.motivateUser)
      // Add edges.
      .addEdge(START, 'checkLastWeekPlan')
      .addConditionalEdges('checkLastWeekPlan', this.decideLastWeekPlanFlow)
      .addConditionalEdges('selectPlanType', this.decidePlanTypeFlow)
      .addConditionalEdges('checkRoutineAndHabits', this.decideRoutineFlow)
      .addEdge('askForRoutine', 'checkMustDoTasks')
      .addConditionalEdges('checkMustDoTasks', this.decideMustDoTasksFlow)
      .addEdge('askForMustDoTasks', 'generateCoreTasks')
      .addConditionalEdges('generateCoreTasks', this.decideCoreSatisfactionFlow)
      .addConditionalEdges('checkUserSatisfactionCore', this.decideCoreSatisfactionAdjustmentFlow)
      .addEdge('addCoreTasksToCalendar', 'generateUnimportantTasks')
      .addConditionalEdges('generateUnimportantTasks', this.decideUnimportantTasksFlow)
      .addConditionalEdges('checkUserSatisfactionUnimportant', this.decideUnimportantTasksAdjustmentFlow)
      .addEdge('addUnimportantTasksToCalendar', 'generateMoreDays')
      .addEdge('generateMoreDays', 'motivateUser')
      .addEdge('motivateUser', END)

    this.graph = builder.compile({ checkpointer })
  }

  private async checkLastWeekPlan(state: WeeklyPlanningState): Promise<NodeOutput> {
    const weekInfo = getWeekInfo(new Date())
    const lastWeekEvents = await getEvents({
      userId: state.userInfo._id,
      from: weekInfo.weekStartDate,
      to: weekInfo.weekEndDate,
    })

    return {
      lastWeekPlan: lastWeekEvents?.map(e => `${format(e.startDate, "EEE, HH:mm")} to ${format(e.endDate, "EEE, HH:mm")}: ${e.title}${e.description ? "- " + e.description : ""}`) ?? [],
      hasLastWeekPlan: lastWeekEvents?.length > 0,
    }
  }

  private async selectPlanType(state: WeeklyPlanningState): Promise<NodeOutput> {
    if (state.planType) return

    if (state.hasLastWeekPlan) {
      const chatMessage = {
        conversationId: state.conversationId,
        authorId: BotUserId,
        authorName: BotUserName,
        content: "Generate your weekly plan?", // TODO: i18n.
        type: MessageTypeAskToGenerateWeekPlan,
        timestamp: new Date(),
      } as Message

      emitConversationMessage(state.conversationId.toHexString(), chatMessage)
      return
    }

    return {
      planType: PlanTypeWeekInteractive,
    }
  }

  private async checkRoutineAndHabits(state: WeeklyPlanningState): Promise<NodeOutput> {
    // TODO.

    return {
      hasRoutineOrHabits: true, // TODO: Replace with actual logic.
    }
  }

  private async askForRoutine(state: WeeklyPlanningState): Promise<NodeOutput> {
    return {}
  }

  private async checkMustDoTasks(state: WeeklyPlanningState): Promise<NodeOutput> {
    return {
    }
  }

  private async askForMustDoTasks(state: WeeklyPlanningState): Promise<NodeOutput> {
    return {}
  }

  private async generateCoreTasks(state: WeeklyPlanningState): Promise<NodeOutput> {
    return {}
  }

  private async checkUserSatisfactionCore(state: WeeklyPlanningState): Promise<NodeOutput> {
    return {}
  }

  private async adjustCoreTasks(state: WeeklyPlanningState): Promise<NodeOutput> {
    return {}
  }

  private async addCoreTasksToCalendar(state: WeeklyPlanningState): Promise<NodeOutput> {
    return {}
  }

  private async generateUnimportantTasks(state: WeeklyPlanningState): Promise<NodeOutput> {
    return {}
  }

  private async checkUserSatisfactionUnimportant(state: WeeklyPlanningState): Promise<NodeOutput> {
    return {}
  }

  private async adjustUnimportantTasks(state: WeeklyPlanningState): Promise<NodeOutput> {
    return {}
  }

  private async addUnimportantTasksToCalendar(state: WeeklyPlanningState): Promise<NodeOutput> {
    return {}
  }

  private async generateMoreDays(state: WeeklyPlanningState): Promise<NodeOutput> {
    return {}
  }

  private async motivateUser(state: WeeklyPlanningState): Promise<NodeOutput> {
    return {}
  }


  // Conditional edge methods
  private decideLastWeekPlanFlow(state: WeeklyPlanningState) {
    return state.hasLastWeekPlan ? 'selectPlanType' : 'selectPlanType';
  }

  private decidePlanTypeFlow(state: WeeklyPlanningState) {
    return state.planType === 'Full' ? 'checkRoutineAndHabits' : 'checkRoutineAndHabits';
  }

  private decideRoutineFlow(state: WeeklyPlanningState) {
    return state.hasRoutineOrHabits ? 'checkMustDoTasks' : 'askForRoutine';
  }

  private decideMustDoTasksFlow(state: WeeklyPlanningState) {
    return state.mustDoTasks && state.mustDoTasks.length > 0
      ? 'generateCoreTasks'
      : 'askForMustDoTasks';
  }

  private decideCoreSatisfactionFlow(state: WeeklyPlanningState) {
    return 'checkUserSatisfactionCore';
  }

  private decideCoreSatisfactionAdjustmentFlow(state: WeeklyPlanningState) {
    return state.isUserSatisfiedWithCoreTasks
      ? 'addCoreTasksToCalendar'
      : 'adjustCoreTasks';
  }

  private decideUnimportantTasksFlow(state: WeeklyPlanningState) {
    return 'checkUserSatisfactionUnimportant';
  }

  private decideUnimportantTasksAdjustmentFlow(state: WeeklyPlanningState) {
    return state.isUserSatisfiedWithUnimportantTasks
      ? 'addUnimportantTasksToCalendar'
      : 'adjustUnimportantTasks';
  }

  async runWorkflow(initialState: Partial<WeeklyPlanningState> = {}) {
    if (!initialState.userInfo || !initialState.conversationId) {
      throw new Error('User info and conversation ID are required')
    }

    const finalState = await this.graph.invoke(initialState, {
      configurable: { thread_id: initialState.conversationId.toHexString() }
    });
    return finalState
  }
}

type WeeklyPlanningState = {
  userInfo: User
  conversationId: ObjectId
  hasLastWeekPlan: boolean
  lastWeekPlan: string[]
  planType: WeekPlanType
  hasRoutineOrHabits: boolean
  routineDetails: string
  mustDoTasks: string[]
  coreTasks: string[]
  isUserSatisfiedWithCoreTasks: boolean
  unimportantTasks: string[]
  isUserSatisfiedWithUnimportantTasks: boolean
  calendarEvents: string[]
  motivationMessage: string
  messages: BaseMessage[]
}

type NodeType = typeof START | "checkLastWeekPlan" | "selectPlanType" | "checkRoutineAndHabits" | "askForRoutine" | "checkMustDoTasks" | "askForMustDoTasks" | "generateCoreTasks" | "checkUserSatisfactionCore" | "adjustCoreTasks" | "addCoreTasksToCalendar" | "generateUnimportantTasks" | "checkUserSatisfactionUnimportant" | "adjustUnimportantTasks" | "addUnimportantTasksToCalendar" | "generateMoreDays" | "motivateUser"

type WeekPlanStateType = { messages: LastValue<Messages>; userInfo: LastValue<User>; conversationId: LastValue<ObjectId>, hasLastWeekPlan: LastValue<boolean>; lastWeekPlan: LastValue<string[]>; planType: LastValue<WeekPlanType>; hasRoutineOrHabits: LastValue<boolean>; routineDetails: LastValue<string>; mustDoTasks: LastValue<string[]>; coreTasks: LastValue<string[]>; isUserSatisfiedWithCoreTasks: LastValue<boolean>; unimportantTasks: LastValue<string[]>; isUserSatisfiedWithUnimportantTasks: LastValue<boolean>; calendarEvents: LastValue<string[]>; motivationMessage: LastValue<string>; }

type NodeOutput = Partial<WeeklyPlanningState> | NodeType | typeof END