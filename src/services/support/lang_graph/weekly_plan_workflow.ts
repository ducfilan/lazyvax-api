import { StateGraph, START, END, CompiledStateGraph, LastValue, Messages, StateDefinition, UpdateType } from '@langchain/langgraph';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { WeeklyPlanningAnnotation } from './annotations';
import { User } from '@/entities/User';
import { getEvents } from '@/services/api/events.services';
import { getWeekInfo } from '@/common/utils/dateUtils';
import { format } from 'date-fns';
import { WeekPlanType } from '@/common/types/types';
import { BotUserId, BotUserName, DaysOfWeekMap, PlanTypeWeekInteractive } from '@common/consts/constants';
import { MessageTypeAskForRoutine, MessageTypeAskForTimezone, MessageTypeAskForWeekToDoTasks, MessageTypeAskToConfirmWeekToDoTasks, MessageTypeAskToGenerateWeekPlan, MessageTypeTextWithEvents } from '@common/consts/message-types';
import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
import { DatabaseName, getDbClient } from '@/common/configs/mongodb-client.config';
import { emitConversationMessage } from '../socket.io.service';
import { ObjectId } from 'mongodb';
import { Message } from '@/entities/Message';
import { getHabits } from '@/services/api/habits.services';
import { getWeeklyPlanTodoTasks } from '@/services/api/conversations.services';
import { saveMessage } from '@/services/api/messages.services';
import { RunnableConfig } from '@langchain/core/runnables';
import { firstDayCoreTasksInstruction, systemMessageShort } from './prompts';

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
      .addNode('askForHabits', this.askForHabits.bind(this))
      .addNode('checkWeekToDoTasks', this.checkWeekToDoTasks.bind(this))
      .addNode('askForWeekToDoTasks', this.askForWeekToDoTasks.bind(this))
      .addNode('confirmWeekToDoTasks', this.confirmWeekToDoTasks.bind(this))
      .addNode('getUserTimezone', this.getUserTimezone.bind(this))
      .addNode('generateFirstDayCoreTasks', this.generateFirstDayCoreTasks.bind(this))
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
      .addEdge('askForHabits', 'checkWeekToDoTasks')
      .addConditionalEdges('checkWeekToDoTasks', this.decideWeekToDoTasksFlow)
      .addConditionalEdges('askForWeekToDoTasks', this.decideWeekToDoTasksAskedFlow)
      .addEdge('confirmWeekToDoTasks', 'getUserTimezone')
      .addEdge('getUserTimezone', 'generateFirstDayCoreTasks')
      .addConditionalEdges('generateFirstDayCoreTasks', this.decideCoreSatisfactionFlow)
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
      habits: habits?.map(h => `${h.title} - ${h.priority} - ${h.repeat.unit} - ${h.repeat.frequency} times ${h.repeat.daysOfWeek ? "on " + buildDaysOfWeekString(h.repeat.daysOfWeek) : ""}`),
    }
  }

  private async askForHabits(state: WeeklyPlanningState): Promise<NodeOutput> {
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
    if (state.weekToDoTasks?.length > 0) return {}

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

  private async confirmWeekToDoTasks(state: WeeklyPlanningState): Promise<NodeOutput> {
    if (state.weekToDoTasksConfirmAsked || state.weekToDoTasksConfirmed) return {}

    const chatMessage = this.createChatMessage(state.conversationId, "Are you satisfied with your must do tasks?", MessageTypeAskToConfirmWeekToDoTasks) // TODO: i18n.
    saveMessage(chatMessage)
    emitConversationMessage(state.conversationId.toHexString(), chatMessage)
    return {
      weekToDoTasksConfirmAsked: true,
    }
  }

  private async getUserTimezone(state: WeeklyPlanningState): Promise<NodeOutput> {
    if (!state.userInfo.preferences?.timezone) {
      const chatMessage = this.createChatMessage(state.conversationId, "What is your timezone?", MessageTypeAskForTimezone) // TODO: i18n.
      saveMessage(chatMessage)
      emitConversationMessage(state.conversationId.toHexString(), chatMessage)
    }

    return {}
  }

  private async generateFirstDayCoreTasks(state: WeeklyPlanningState): Promise<NodeOutput> {
    if (!state.weekToDoTasksConfirmed) return {}

    const prompt = await ChatPromptTemplate.fromMessages([
      ["system", systemMessageShort],
      ["human", `### Context: ###\nToday is ${format(new Date(), "EEEE, MMMM do yyyy, HH:mm:ss")}.\nHabits:\n{habit}\nTo do tasks this week:\n{weekToDoTask}\nWhat's on calendar this week:\n{calendarEvents}\n### Instructions: ###\n{instructions}`],
    ]).formatMessages({
      habit: state.habits?.map(h => `- ${h}`).join('\n'),
      weekToDoTask: state.weekToDoTasks?.map(t => `- ${t}`).join('\n'),
      calendarEvents: state.calendarEvents?.map(e => `- ${e}`).join('\n'),
      instructions: firstDayCoreTasksInstruction(state.userInfo.preferences?.timezone),
    })
    const result = await this.model.invoke(prompt)

    const chatMessage = this.createChatMessage(state.conversationId, result.content, MessageTypeTextWithEvents)
    saveMessage(chatMessage)
    emitConversationMessage(state.conversationId.toHexString(), chatMessage)

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
    return !state.planType || state.planType !== PlanTypeWeekInteractive ? END : 'checkRoutineAndHabits'; // TODO: Not interactive then do full plan.
  }

  private decideRoutineFlow(state: WeeklyPlanningState) {
    return state.hasRoutineOrHabits ? 'checkWeekToDoTasks' : 'askForHabits';
  }

  private decideWeekToDoTasksFlow(state: WeeklyPlanningState) {
    return state.weekToDoTasks && state.weekToDoTasks.length > 0
      ? 'confirmWeekToDoTasks'
      : 'askForWeekToDoTasks';
  }

  private decideWeekToDoTasksAskedFlow(state: WeeklyPlanningState) {
    if (!state.weekToDoTasks || state.weekToDoTasks.length === 0) {
      return END;
    }

    return 'confirmWeekToDoTasks';
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

    const finalState = await this.graph.invoke({ ...(lastState?.channel_values ?? {}), ...initialState }, config);
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
  weekToDoTasksConfirmAsked: boolean
  weekToDoTasksConfirmed: boolean
  coreTasks: string[]
  isUserSatisfiedWithCoreTasks: boolean
  unimportantTasks: string[]
  isUserSatisfiedWithUnimportantTasks: boolean
  calendarEvents: string[]
  motivationMessage: string
  messages: BaseMessage[]
}

type NodeType = typeof START | "checkLastWeekPlan" | "selectPlanType" | "checkRoutineAndHabits" | "askForHabits" | "checkWeekToDoTasks" | "askForWeekToDoTasks" | "confirmWeekToDoTasks" | "getUserTimezone" | "generateFirstDayCoreTasks" | "checkUserSatisfactionCore" | "adjustCoreTasks" | "addCoreTasksToCalendar" | "generateUnimportantTasks" | "checkUserSatisfactionUnimportant" | "adjustUnimportantTasks" | "addUnimportantTasksToCalendar" | "generateMoreDays" | "motivateUser"

type WeekPlanStateType = {
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
  weekToDoTasksConfirmAsked: LastValue<boolean>
  weekToDoTasksConfirmed: LastValue<boolean>
  coreTasks: LastValue<string[]>
  isUserSatisfiedWithCoreTasks: LastValue<boolean>
  unimportantTasks: LastValue<string[]>
  isUserSatisfiedWithUnimportantTasks: LastValue<boolean>
  calendarEvents: LastValue<string[]>
  motivationMessage: LastValue<string>
  messages: LastValue<Messages>
}

type NodeOutput = Partial<WeeklyPlanningState> | NodeType | typeof END