import { StateGraph, START, END, CompiledStateGraph, LastValue, Messages, StateDefinition, UpdateType } from '@langchain/langgraph';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage } from '@langchain/core/messages';
import { WeeklyPlanningAnnotation } from './annotations';
import { User } from '@/entities/User';
import { getEvents } from '@/services/api/events.services';
import { getWeekInfo } from '@/common/utils/dateUtils';
import { format } from 'date-fns';
import { WeekPlanType } from '@/common/types/types';
import { BotUserId, BotUserName, DaysOfWeekMap, i18n, MessageTypeAskForRoutine, MessageTypeAskForWeekToDoTasks, MessageTypeAskToGenerateWeekPlan, PlanTypeWeekInteractive } from '@/common/consts/constants';
import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
import { DatabaseName, getDbClient } from '@/common/configs/mongodb-client.config';
import { emitConversationMessage } from '../socket.io.service';
import { ObjectId } from 'mongodb';
import { Message } from '@/entities/Message';
import { getHabits } from '@/services/api/habits.services';
import { getWeeklyPlanTodoTasks } from '@/services/api/conversations.services';
import { saveMessage } from '@/services/api/messages.services';
import { RunnableConfig } from '@langchain/core/runnables';

export class WeeklyPlanningWorkflow {
  private model: BaseLanguageModel;
  private checkpointer: MongoDBSaver;
  private graph: CompiledStateGraph<WeeklyPlanningState, UpdateType<WeekPlanStateType>, NodeType, WeekPlanStateType, WeekPlanStateType, StateDefinition>;

  constructor(model?: BaseLanguageModel) {
    this.model = model || new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.6
    })

    this.checkpointer = new MongoDBSaver({ client: getDbClient(), dbName: DatabaseName })

    const builder = new StateGraph(WeeklyPlanningAnnotation)
      // Add nodes.
      .addNode('checkLastWeekPlan', this.checkLastWeekPlan.bind(this))
      .addNode('selectPlanType', this.selectPlanType.bind(this))
      .addNode('checkRoutineAndHabits', this.checkRoutineAndHabits.bind(this))
      .addNode('askForRoutine', this.askForRoutine.bind(this))
      .addNode('checkWeekToDoTasks', this.checkWeekToDoTasks.bind(this))
      .addNode('askForWeekToDoTasks', this.askForWeekToDoTasks.bind(this))
      .addNode('generateCoreTasks', this.generateCoreTasks.bind(this))
      .addNode('checkUserSatisfactionCore', this.checkUserSatisfactionCore.bind(this))
      .addNode('adjustCoreTasks', this.adjustCoreTasks.bind(this))
      .addNode('addCoreTasksToCalendar', this.addCoreTasksToCalendar.bind(this))
      .addNode('generateUnimportantTasks', this.generateUnimportantTasks.bind(this))
      .addNode('checkUserSatisfactionUnimportant', this.checkUserSatisfactionUnimportant.bind(this))
      .addNode('adjustUnimportantTasks', this.adjustUnimportantTasks.bind(this))
      .addNode('addUnimportantTasksToCalendar', this.addUnimportantTasksToCalendar.bind(this))
      .addNode('generateMoreDays', this.generateMoreDays.bind(this))
      .addNode('motivateUser', this.motivateUser.bind(this))
      // Add edges.
      .addEdge(START, 'checkLastWeekPlan')
      .addConditionalEdges('checkLastWeekPlan', this.decideLastWeekPlanFlow)
      .addConditionalEdges('selectPlanType', this.decidePlanTypeFlow)
      .addConditionalEdges('checkRoutineAndHabits', this.decideRoutineFlow)
      .addEdge('askForRoutine', 'checkWeekToDoTasks')
      .addConditionalEdges('checkWeekToDoTasks', this.decideWeekToDoTasksFlow)
      .addEdge('askForWeekToDoTasks', 'generateCoreTasks')
      .addConditionalEdges('generateCoreTasks', this.decideCoreSatisfactionFlow)
      .addConditionalEdges('checkUserSatisfactionCore', this.decideCoreSatisfactionAdjustmentFlow)
      .addEdge('addCoreTasksToCalendar', 'generateUnimportantTasks')
      .addConditionalEdges('generateUnimportantTasks', this.decideUnimportantTasksFlow)
      .addConditionalEdges('checkUserSatisfactionUnimportant', this.decideUnimportantTasksAdjustmentFlow)
      .addEdge('addUnimportantTasksToCalendar', 'generateMoreDays')
      .addEdge('generateMoreDays', 'motivateUser')
      .addEdge('motivateUser', END)

    this.graph = builder.compile({ checkpointer: this.checkpointer })
  }

  private createChatMessage(conversationId: ObjectId, content: string, type: number): Message {
    return {
      conversationId,
      authorId: BotUserId,
      authorName: BotUserName,
      content,
      type,
      timestamp: new Date(),
    } as Message
  }

  private async checkLastWeekPlan(state: WeeklyPlanningState): Promise<NodeOutput> {
    const weekInfo = getWeekInfo(new Date())
    const lastWeekEvents = await getEvents({
      userId: state.userInfo._id,
      from: weekInfo.weekStartDate,
      to: weekInfo.weekEndDate,
    }) // TODO: More filters.

    return {
      lastWeekPlan: lastWeekEvents?.map(e => `${format(e.startDate, "EEE, HH:mm")} to ${format(e.endDate, "EEE, HH:mm")}: ${e.title}${e.description ? "- " + e.description : ""}`) ?? [],
      hasLastWeekPlan: lastWeekEvents?.length > 0,
    }
  }

  private async selectPlanType(state: WeeklyPlanningState): Promise<NodeOutput> {
    if (state.planType || state.planTypeAsked) return

    if (!state.hasLastWeekPlan) {
      const chatMessage = this.createChatMessage(state.conversationId, "We will plan interactively.", MessageTypeAskToGenerateWeekPlan)
      saveMessage(chatMessage)
      emitConversationMessage(state.conversationId.toHexString(), chatMessage)

      return {
        planType: PlanTypeWeekInteractive,
      }
    }

    const chatMessage = this.createChatMessage(state.conversationId, "Generate your weekly plan?", MessageTypeAskToGenerateWeekPlan) // TODO: i18n.
    saveMessage(chatMessage)
    emitConversationMessage(state.conversationId.toHexString(), chatMessage)
    return {
      planTypeAsked: true,
    }
  }

  private async checkRoutineAndHabits(state: WeeklyPlanningState): Promise<NodeOutput> {
    const habits = await getHabits({ userId: state.userInfo._id })
    const buildDaysOfWeekString = (daysOfWeek: number[]) => daysOfWeek?.map(d => DaysOfWeekMap[d]).join(', ') // TODO: i18n.
    // TODO: Days in month.

    return {
      hasRoutineOrHabits: habits?.length > 0,
      habits: habits?.map(h => `${h.title} - ${h.priority} - ${h.repeat.unit} - ${h.repeat.frequency} times, ${h.repeat.daysOfWeek ? buildDaysOfWeekString(h.repeat.daysOfWeek) : ""}`),
    }
  }

  private async askForRoutine(state: WeeklyPlanningState): Promise<NodeOutput> {
    if (state.hasRoutineOrHabits || state.habitsAsked) {
      return {}
    }

    const chatMessage = this.createChatMessage(state.conversationId, "What is your routine? Please go to Habits page to check your habits.", MessageTypeAskForRoutine) // TODO: i18n.
    saveMessage(chatMessage)
    emitConversationMessage(state.conversationId.toHexString(), chatMessage)
    return {
      habitsAsked: true,
    }

    return {}
  }

  private async checkWeekToDoTasks(state: WeeklyPlanningState): Promise<NodeOutput> {
    const conversationId = state.conversationId
    const todoTasks = await getWeeklyPlanTodoTasks(conversationId)

    return {
      weekToDoTasks: todoTasks?.map(t => `${t.title} - ${t.dueDate ? format(t.dueDate, "EEE, HH:mm") : ""}: ${t.completed ? "Done" : "Not done"}`),
    }
  }

  private async askForWeekToDoTasks(state: WeeklyPlanningState): Promise<NodeOutput> {
    if (state.weekToDoTasksAsked || state.weekToDoTasks?.length > 0) return {}

    const chatMessage = this.createChatMessage(state.conversationId, "What are your must do tasks in this week?", MessageTypeAskForWeekToDoTasks) // TODO: i18n.
    saveMessage(chatMessage)
    emitConversationMessage(state.conversationId.toHexString(), chatMessage)
    return {
      weekToDoTasksAsked: true,
    }
  }

  private async generateCoreTasks(state: WeeklyPlanningState): Promise<NodeOutput> {
    if (!state.weekToDoTasks || state.weekToDoTasks.length === 0) return {}

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

  private decideLastWeekPlanFlow(state: WeeklyPlanningState) {
    return state.hasLastWeekPlan ? 'selectPlanType' : 'checkRoutineAndHabits';
  }

  private decidePlanTypeFlow(state: WeeklyPlanningState) {
    return !state.planType || state.planType !== PlanTypeWeekInteractive ? END : 'checkRoutineAndHabits';
  }

  private decideRoutineFlow(state: WeeklyPlanningState) {
    return state.hasRoutineOrHabits ? 'checkWeekToDoTasks' : 'askForRoutine';
  }

  private decideWeekToDoTasksFlow(state: WeeklyPlanningState) {
    return state.weekToDoTasks && state.weekToDoTasks.length > 0
      ? 'generateCoreTasks'
      : 'askForWeekToDoTasks';
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
    const config: RunnableConfig = {
      configurable: { thread_id: initialState.conversationId.toHexString() }
    }

    const lastState = await this.checkpointer.get(config)
    console.log(lastState)

    const finalState = await this.graph.invoke(initialState, config);
    return finalState
  }
}

type WeeklyPlanningState = {
  userInfo: User
  conversationId: ObjectId
  hasLastWeekPlan: boolean
  lastWeekPlan: string[]
  planType: WeekPlanType
  planTypeAsked: boolean
  hasRoutineOrHabits: boolean
  habitsAsked: boolean
  habits: string[]
  weekToDoTasks: string[]
  weekToDoTasksAsked: boolean
  coreTasks: string[]
  isUserSatisfiedWithCoreTasks: boolean
  unimportantTasks: string[]
  isUserSatisfiedWithUnimportantTasks: boolean
  calendarEvents: string[]
  motivationMessage: string
  messages: BaseMessage[]
}

type NodeType = typeof START | "checkLastWeekPlan" | "selectPlanType" | "checkRoutineAndHabits" | "askForRoutine" | "checkWeekToDoTasks" | "askForWeekToDoTasks" | "generateCoreTasks" | "checkUserSatisfactionCore" | "adjustCoreTasks" | "addCoreTasksToCalendar" | "generateUnimportantTasks" | "checkUserSatisfactionUnimportant" | "adjustUnimportantTasks" | "addUnimportantTasksToCalendar" | "generateMoreDays" | "motivateUser"

type WeekPlanStateType = {
  messages: LastValue<Messages>
  userInfo: LastValue<User>
  conversationId: LastValue<ObjectId>
  hasLastWeekPlan: LastValue<boolean>
  lastWeekPlan: LastValue<string[]>
  planType: LastValue<WeekPlanType>
  planTypeAsked: LastValue<boolean>
  hasRoutineOrHabits: LastValue<boolean>
  habitsAsked: LastValue<boolean>
  habits: LastValue<string[]>
  weekToDoTasks: LastValue<string[]>
  weekToDoTasksAsked: LastValue<boolean>
  coreTasks: LastValue<string[]>
  isUserSatisfiedWithCoreTasks: LastValue<boolean>
  unimportantTasks: LastValue<string[]>
  isUserSatisfiedWithUnimportantTasks: LastValue<boolean>
  calendarEvents: LastValue<string[]>
  motivationMessage: LastValue<string>
}

type NodeOutput = Partial<WeeklyPlanningState> | NodeType | typeof END