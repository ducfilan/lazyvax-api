import { StateGraph, START, END, CompiledStateGraph, LastValue, Messages, StateDefinition, UpdateType, Annotation, MessagesAnnotation } from '@langchain/langgraph';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { User } from '@/entities/User';
import { getEvents } from '@/services/api/events.services';
import { formatDateToWeekDay, formatDateToWeekDayAndDate, formatDateToWeekDayAndDateTime, formatDateToWeekDayAndTime, getWeekInfo, isEvening } from '@/common/utils/dateUtils';
import { addDays, endOfDay, getDay, startOfDay, startOfWeek } from 'date-fns';
import { WeekPlanType } from '@/common/types/types';
import { BotUserId, BotUserName, DaysOfWeekMap, PlanTypeWeekInteractive } from '@common/consts/constants';
import {
  MessageTypeAskForNextDayTasks,
  MessageTypeAskForRoutine, MessageTypeAskForTimezone, MessageTypeAskForWeekToDoTasks,
  MessageTypeAskToConfirmFirstDayTasks, MessageTypeAskToConfirmNextDayTasks, MessageTypeAskToConfirmWeekToDoTasks, MessageTypeAskToGenerateWeekPlan, MessageTypeAskToMoveToNextWeek, MessageTypePlainText, MessageTypeTextWithEvents
} from '@common/consts/message-types';
import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
import { DatabaseName, getDbClient } from '@/common/configs/mongodb-client.config';
import { emitConversationMessage } from '../socket.io.service';
import { ObjectId } from 'mongodb';
import { Message } from '@/entities/Message';
import { getHabits } from '@/services/api/habits.services';
import { getWeeklyPlanTodoTasks } from '@/services/api/conversations.services';
import { saveMessage } from '@/services/api/messages.services';
import { RunnableConfig } from '@langchain/core/runnables';
import { dayCoreTasksInstruction, systemMessageShort, userInformationPrompt } from './prompts';
import logger from '@/common/logger';

export class WeeklyPlanningWorkflow {
  private model: BaseLanguageModel;
  private checkpointer: MongoDBSaver;
  private graph: CompiledStateGraph<WeeklyPlanningState, UpdateType<WeekPlanStateType>, NodeType, WeekPlanStateType, WeekPlanStateType, StateDefinition>;

  constructor(model?: BaseLanguageModel) {
    this.model = model || new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.6,
      cache: true,
    })

    this.checkpointer = new MongoDBSaver({ client: getDbClient(), dbName: DatabaseName })

    const builder = new StateGraph(WeeklyPlanningAnnotation)
      // Add nodes.
      .addNode('checkLastWeekPlan', this.checkLastWeekPlan.bind(this))
      .addNode('selectPlanType', this.selectPlanType.bind(this))
      .addNode('checkRoutineAndHabits', this.checkRoutineAndHabits.bind(this))
      .addNode('askForHabits', this.askForHabits.bind(this))
      .addNode('checkCalendarEvents', this.checkCalendarEvents.bind(this))
      .addNode('checkWeekToDoTasks', this.checkWeekToDoTasks.bind(this))
      .addNode('askForWeekToDoTasks', this.askForWeekToDoTasks.bind(this))
      .addNode('confirmWeekToDoTasks', this.confirmWeekToDoTasks.bind(this))
      .addNode('getUserTimezone', this.getUserTimezone.bind(this))
      .addNode('generateFirstDayTasks', this.generateFirstDayTasks.bind(this))
      .addNode('checkFirstDayTasksSatisfied', this.checkFirstDayTasksSatisfied.bind(this))
      .addNode('generateMoreDays', this.generateMoreDays.bind(this))
      .addNode('motivateUser', this.motivateUser.bind(this))
      // Add edges.
      .addEdge(START, 'checkLastWeekPlan')
      .addConditionalEdges('checkLastWeekPlan', this.decideLastWeekPlanFlow)
      .addConditionalEdges('selectPlanType', this.decidePlanTypeFlow)
      .addConditionalEdges('checkRoutineAndHabits', this.decideRoutineFlow)
      .addConditionalEdges('askForHabits', this.decideHabitsFlow)
      .addEdge('checkCalendarEvents', 'checkWeekToDoTasks')
      .addConditionalEdges('checkWeekToDoTasks', this.decideWeekToDoTasksFlow)
      .addConditionalEdges('askForWeekToDoTasks', this.decideWeekToDoTasksAskedFlow)
      .addEdge('confirmWeekToDoTasks', 'getUserTimezone')
      .addEdge('getUserTimezone', 'generateFirstDayTasks')
      .addEdge('generateFirstDayTasks', 'checkFirstDayTasksSatisfied')
      .addConditionalEdges('checkFirstDayTasksSatisfied', this.decideGenerateFirstDayTasksFlow)
      .addConditionalEdges('generateMoreDays', this.decideMoreDaysFlow)
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

  private async sendMessage(conversationId: ObjectId, content: string, type: number) {
    const chatMessage = this.createChatMessage(conversationId, content, type)
    const messageId = await saveMessage(chatMessage)
    chatMessage._id = messageId
    emitConversationMessage(conversationId.toHexString(), chatMessage)
  }

  private async checkLastWeekPlan(state: WeeklyPlanningState): Promise<NodeOutput> {
    // TODO: Maybe this week so far if planning on Sunday.
    logger.debug(`checkLastWeekPlan`)
    const weekInfo = getWeekInfo(new Date())
    const lastWeekEvents = await getEvents({
      userId: state.userInfo._id,
      from: weekInfo.weekStartDate,
      to: weekInfo.weekEndDate,
    }) // TODO: More filters.

    const timeZone = state.userInfo.preferences?.timezone

    return {
      lastWeekPlan: lastWeekEvents?.map(e => `${formatDateToWeekDayAndTime(e.startDate, timeZone)} to ${formatDateToWeekDayAndTime(e.endDate, timeZone)}: ${e.title}${e.description ? " (" + e.description + ")" : ""}`) ?? [],
      hasLastWeekPlan: lastWeekEvents?.length > 0,
    }
  }

  private async selectPlanType(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`selectPlanType`)
    if (state.planType || state.planTypeAsked) return

    if (!state.hasLastWeekPlan) {
      await this.sendMessage(state.conversationId, "We will plan interactively.", MessageTypeAskToGenerateWeekPlan)

      return {
        planType: PlanTypeWeekInteractive,
      }
    }

    await this.sendMessage(state.conversationId, "Generate your weekly plan?", MessageTypeAskToGenerateWeekPlan)
    return {
      planTypeAsked: true,
    }
  }

  private async checkRoutineAndHabits(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`checkRoutineAndHabits`)
    const habits = await getHabits({ userId: state.userInfo._id })
    const buildDaysOfWeekString = (daysOfWeek: number[]) => daysOfWeek?.map(d => DaysOfWeekMap[d]).join(', ') // TODO: i18n.
    // TODO: Days in month.

    return {
      hasRoutineOrHabits: habits?.length > 0,
      habits: habits?.map(h => `${h.title} - ${h.priority} - ${h.repeat.unit} - ${h.repeat.frequency} times ${h.repeat.daysOfWeek ? "on " + buildDaysOfWeekString(h.repeat.daysOfWeek) : ""}`),
    }
  }

  private async askForHabits(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`askForHabits`)
    if (state.hasRoutineOrHabits || state.habitsAsked) {
      return {}
    }

    await this.sendMessage(state.conversationId, "What is your routine? Please go to Habits page to check your habits.", MessageTypeAskForRoutine) // TODO: i18n.
    return {
      habitsAsked: true,
    }
  }

  private async checkCalendarEvents(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`checkCalendarEvents`)
    const weekInfo = getWeekInfo(new Date())
    const calendarEvents = await getEvents({
      userId: state.userInfo._id,
      from: weekInfo.weekStartDate,
      to: weekInfo.weekEndDate,
    })

    return {
      calendarEvents: calendarEvents?.map(e => `${formatDateToWeekDayAndTime(e.startDate, state.userInfo.preferences?.timezone)} to ${formatDateToWeekDayAndTime(e.endDate, state.userInfo.preferences?.timezone)}: ${e.title}${e.description ? " (" + e.description + ")" : ""}`) ?? [],
    }
  }

  private async checkWeekToDoTasks(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`checkWeekToDoTasks`)
    if (state.weekToDoTasks?.length > 0) return {}

    const conversationId = state.conversationId
    const todoTasks = await getWeeklyPlanTodoTasks(conversationId)

    return {
      weekToDoTasks: todoTasks?.map(t => `${t.title} - ${t.dueDate ? formatDateToWeekDayAndTime(t.dueDate, state.userInfo.preferences?.timezone) : ""}: ${t.completed ? "Done" : "Not done"}`),
    }
  }

  private async askForWeekToDoTasks(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`askForWeekToDoTasks`)
    if (state.weekToDoTasksAsked || state.weekToDoTasks?.length > 0) return {}

    await this.sendMessage(state.conversationId, "What are your must do tasks in this week?", MessageTypeAskForWeekToDoTasks) // TODO: i18n.
    return {
      weekToDoTasksAsked: true,
    }
  }

  private async confirmWeekToDoTasks(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`confirmWeekToDoTasks`)
    if (state.weekToDoTasksConfirmAsked || state.weekToDoTasksConfirmed) return {}

    await this.sendMessage(state.conversationId, "Are you satisfied with your must do tasks?", MessageTypeAskToConfirmWeekToDoTasks) // TODO: i18n.
    return {
      weekToDoTasksConfirmAsked: true,
    }
  }

  private async getUserTimezone(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`getUserTimezone: ${state.userInfo.preferences?.timezone}`)
    if (!state.userInfo.preferences?.timezone) {
      await this.sendMessage(state.conversationId, "What is your timezone?", MessageTypeAskForTimezone) // TODO: i18n.
    }

    return {}
  }

  private async generateFirstDayTasks(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`generateFirstDayTasks: ${state.firstDayIndex}`)
    // TODO: May generate for today instead of tomorrow if it's not too late, or maybe ask for confirmation.
    // TODO: What if it's Sunday?
    let firstDayIndex = state.firstDayIndex ?? (getDay(new Date()) + 6) % 7 // TODO: Start on Monday, what if start on Sunday.
    if (isEvening(new Date(), state.userInfo.preferences?.timezone)) {
      await this.sendMessage(state.conversationId, "It's getting late. We will plan for tomorrow.", MessageTypePlainText) // TODO: i18n.
      firstDayIndex += 1
    }

    if (firstDayIndex > 6) {
      await this.sendMessage(state.conversationId, "This week is over. Let's move to next week.", MessageTypeAskToMoveToNextWeek) // TODO: AI + i18n.

      return {}
    }

    if (!state.weekToDoTasksConfirmed || state.daysInWeekTasksSuggested[firstDayIndex]) return {}

    await this.sendMessage(state.conversationId, `Generating tasks for ${formatDateToWeekDay(addDays(state.weekStartDate, firstDayIndex), state.userInfo.preferences?.timezone)}...`, MessageTypePlainText)

    const prompt = await ChatPromptTemplate.fromMessages([
      ["system", systemMessageShort],
      ["human", `### Context: ###\nNow is ${formatDateToWeekDayAndDateTime(new Date(), state.userInfo.preferences?.timezone)}.\n{user_info}\nHabits:\n{habit}\nTo do tasks this week:\n{weekToDoTask}\nWhat's on calendar this week:\n{calendarEvents}\n### Instructions: ###\n{instructions}`],
    ]).formatMessages({
      user_info: userInformationPrompt(state.userInfo),
      habit: state.habits?.map(h => `- ${h}`).join('\n'),
      weekToDoTask: state.weekToDoTasks?.map(t => `- ${t}`).join('\n'),
      calendarEvents: state.calendarEvents?.map(e => `- ${e}`).join('\n'),
      instructions: dayCoreTasksInstruction(state.userInfo.preferences?.timezone),
    })
    logger.debug(`generateFirstDayTasks: ${prompt}`)
    const result = await this.model.invoke(prompt)
    logger.debug(`generateFirstDayTasks: ${result.content}`)

    await this.sendMessage(state.conversationId, result.content, MessageTypeTextWithEvents)

    const daysInWeekTasksSuggested = [...state.daysInWeekTasksSuggested]
    daysInWeekTasksSuggested[firstDayIndex] = true

    const daysInWeekTasksAskedToSuggest = [...state.daysInWeekTasksAskedToSuggest]
    daysInWeekTasksAskedToSuggest[firstDayIndex] = true

    return {
      firstDayIndex,
      daysInWeekTasksSuggested,
      daysInWeekTasksAskedToSuggest
    }
  }

  private async checkFirstDayTasksSatisfied(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`checkFirstDayTasksSatisfied: ${state.firstDayIndex}`)
    if (!state.daysInWeekTasksSuggested[state.firstDayIndex] || state.daysInWeekTasksConfirmedAsked[state.firstDayIndex]) return {}

    const firstDayDate = addDays(state.weekStartDate, state.firstDayIndex)
    if (!state.daysInWeekTasksConfirmedAsked[state.firstDayIndex]) {
      const content = {
        index: state.firstDayIndex,
        content: `Are you satisfied with your tasks for ${formatDateToWeekDay(firstDayDate, state.userInfo.preferences?.timezone)}?`,
      }
      await this.sendMessage(state.conversationId, JSON.stringify(content), MessageTypeAskToConfirmFirstDayTasks) // TODO: i18n.

      const daysInWeekTasksConfirmedAsked = [...state.daysInWeekTasksConfirmedAsked]
      daysInWeekTasksConfirmedAsked[state.firstDayIndex] = true

      return {
        daysInWeekTasksConfirmedAsked,
      }
    }

    if (!state.daysInWeekTasksConfirmed[state.firstDayIndex]) {
      return {}
    }

    const firstDayEvents = await getEvents({
      userId: state.userInfo._id,
      from: startOfDay(firstDayDate),
      to: endOfDay(firstDayDate),
    })

    const daysInWeekTasks = [...state.daysInWeekTasks ?? [[], [], [], [], [], [], []]]
    daysInWeekTasks[state.firstDayIndex] = firstDayEvents?.map(e => `${formatDateToWeekDayAndTime(e.startDate, state.userInfo.preferences?.timezone)} to ${formatDateToWeekDayAndTime(e.endDate, state.userInfo.preferences?.timezone)}: ${e.title}${e.description ? " (" + e.description + ")" : ""}`) ?? []
    return {
      daysInWeekTasks,
    }
  }

  private async generateMoreDays(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`generateMoreDays: ${state.firstDayIndex}`)
    let notConfirmedDayIndex = state.daysInWeekTasksConfirmed.findIndex((confirmation, i) => confirmation === null && i > state.firstDayIndex)
    if (notConfirmedDayIndex === -1 && !state.motivationMessage) {
      return {
        allDaysInWeekTasksConfirmed: true,
        flowIsDone: true,
        motivationMessage: "This is motivation message lol. You have confirmed all tasks for this week. Enjoy your week!", // TODO: AI + i18n.
      }
    }

    if (!state.daysInWeekTasksAskedToSuggest[notConfirmedDayIndex]) {
      const content = {
        content: `Do you want to have suggestions for ${formatDateToWeekDay(addDays(state.weekStartDate, notConfirmedDayIndex), state.userInfo.preferences?.timezone)}?`,
        index: notConfirmedDayIndex,
      }
      await this.sendMessage(state.conversationId, JSON.stringify(content), MessageTypeAskForNextDayTasks) // TODO: i18n.

      const daysInWeekTasksAskedToSuggest = [...state.daysInWeekTasksAskedToSuggest]
      daysInWeekTasksAskedToSuggest[notConfirmedDayIndex] = true
      return {
        daysInWeekTasksAskedToSuggest
      }
    }

    if (!state.daysInWeekTasksConfirmedToSuggest[state.nextDayIndex]) {
      return {}
    }

    if (state.daysInWeekTasksSuggested[notConfirmedDayIndex]) {
      return {}
    }

    await this.sendMessage(
      state.conversationId,
      `Generating tasks for ${formatDateToWeekDay(addDays(state.weekStartDate, notConfirmedDayIndex), state.userInfo.preferences?.timezone)}...`,
      MessageTypePlainText
    )

    const prompt = await ChatPromptTemplate.fromMessages([
      ["system", systemMessageShort],
      ["human", `### Context: ###\nNow is ${formatDateToWeekDayAndDateTime(new Date(), state.userInfo.preferences?.timezone)}.\n{user_info}\nHabits:\n{habit}\nTo do tasks this week:\n{weekToDoTask}\nWhat's on calendar this week:\n{calendarEvents}\nPlanned tasks:\n{plannedTasks}\n### Instructions: ###\n{instructions}`],
    ]).formatMessages({
      user_info: userInformationPrompt(state.userInfo),
      habit: state.habits?.map(h => `- ${h}`).join('\n'),
      weekToDoTask: state.weekToDoTasks?.map(t => `- ${t}`).join('\n'),
      calendarEvents: state.calendarEvents?.map(e => `- ${e}`).join('\n'),
      plannedTasks: state.daysInWeekTasks?.map((t, i) => {
        if (t.length === 0) return ""
        return `### ${formatDateToWeekDay(addDays(state.weekStartDate, i), state.userInfo.preferences?.timezone)} ###\n${t.map(t => `- ${t}`).join('\n')}`
      }).join('\n\n') ?? "",
      instructions: dayCoreTasksInstruction(state.userInfo.preferences?.timezone),
    })
    logger.debug(`generateMoreDays: ${prompt}`)
    const result = await this.model.invoke(prompt)
    logger.debug(`generateMoreDays: ${result.content}`)

    await this.sendMessage(state.conversationId, result.content, MessageTypeTextWithEvents)

    const daysInWeekTasksSuggested = [...state.daysInWeekTasksSuggested]
    daysInWeekTasksSuggested[notConfirmedDayIndex] = true

    if (!state.daysInWeekTasksConfirmedAsked[notConfirmedDayIndex]) {
      const content = {
        index: notConfirmedDayIndex,
        content: `Are you satisfied with your tasks for ${formatDateToWeekDay(addDays(state.weekStartDate, notConfirmedDayIndex), state.userInfo.preferences?.timezone)}?`,
      }
      await this.sendMessage(state.conversationId, JSON.stringify(content), MessageTypeAskToConfirmNextDayTasks) // TODO: i18n.

      const daysInWeekTasksConfirmedAsked = [...state.daysInWeekTasksConfirmedAsked]
      daysInWeekTasksConfirmedAsked[notConfirmedDayIndex] = true

      return {
        daysInWeekTasksConfirmedAsked,
        daysInWeekTasksSuggested,
      }
    }

    return {
      daysInWeekTasksSuggested,
    }
  }

  private async motivateUser(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`motivateUser`)

    if (state.motivationMessage) {
      await this.sendMessage(state.conversationId, state.motivationMessage, MessageTypePlainText)
    }

    return {}
  }

  private decideLastWeekPlanFlow(state: WeeklyPlanningState) {
    return state.hasLastWeekPlan ? 'selectPlanType' : 'checkRoutineAndHabits';
  }

  private decidePlanTypeFlow(state: WeeklyPlanningState) {
    return !state.planType || state.planType !== PlanTypeWeekInteractive ? END : 'checkRoutineAndHabits'; // TODO: Not interactive then do full plan.
  }

  private decideRoutineFlow(state: WeeklyPlanningState) {
    return state.hasRoutineOrHabits ? 'checkCalendarEvents' : 'askForHabits';
  }

  private decideHabitsFlow(state: WeeklyPlanningState) {
    // TODO: Maybe having option to skip habits.
    if (!state.habits || state.habits.length === 0) {
      return END;
    }

    return 'checkCalendarEvents';
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

  private decideGenerateFirstDayTasksFlow(state: WeeklyPlanningState) {
    // TODO: Maybe ask to modify or generate more.
    return state.daysInWeekTasksConfirmed[state.firstDayIndex] ? 'generateMoreDays' : 'motivateUser';
  }

  private decideMoreDaysFlow(state: WeeklyPlanningState) {
    if (state.flowIsDone) return END

    return state.allDaysInWeekTasksConfirmed ? 'motivateUser' : 'generateMoreDays';
  }

  async runWorkflow(initialState: Partial<WeeklyPlanningState> = {}, updateState?: UpdateState) {
    if (!initialState.userInfo || !initialState.conversationId) {
      throw new Error('User info and conversation ID are required')
    }
    const config: RunnableConfig = {
      configurable: { thread_id: initialState.conversationId.toHexString() }
    }

    const lastState = (await this.checkpointer.get(config))?.channel_values ?? {
      weekStartDate: startOfWeek(new Date(), { weekStartsOn: 1 }),
      daysInWeekTasks: [[], [], [], [], [], [], []],
      daysInWeekTasksConfirmedAsked: [false, false, false, false, false, false, false],
      daysInWeekTasksAskedToSuggest: [false, false, false, false, false, false, false],
      daysInWeekTasksSuggested: [false, false, false, false, false, false, false],
      daysInWeekTasksConfirmedToSuggest: [false, false, false, false, false, false, false],
      daysInWeekTasksConfirmed: [null, null, null, null, null, null, null],
    }

    if (updateState) {
      if (updateState.targetType === 'array') {
        lastState[updateState.target][updateState.targetIndex] = updateState.value
      } else {
        lastState[updateState.target] = updateState.value
      }
    }

    const finalState = await this.graph.invoke({ ...lastState, ...initialState }, config);
    return finalState
  }
}

type WeeklyPlanningState = {
  weekStartDate: Date
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
  firstDayIndex: number
  daysInWeekTasks: string[][]
  daysInWeekTasksSuggested: boolean[]
  daysInWeekTasksAskedToSuggest: boolean[]
  daysInWeekTasksConfirmedToSuggest: boolean[]
  daysInWeekTasksConfirmedAsked: boolean[]
  daysInWeekTasksConfirmed: (boolean | null)[]
  nextDayIndex: number
  allDaysInWeekTasksConfirmed: boolean
  calendarEvents: string[]
  motivationMessage: string
  flowIsDone: boolean
  messages: BaseMessage[]
}

type NodeType = typeof START | "checkLastWeekPlan" | "selectPlanType" | "checkRoutineAndHabits" | "askForHabits" | "checkWeekToDoTasks" | "askForWeekToDoTasks" | "confirmWeekToDoTasks" | "getUserTimezone" | "checkCalendarEvents" | "generateFirstDayTasks" | "checkFirstDayTasksSatisfied" | "generateMoreDays" | "motivateUser"

type WeekPlanStateType = {
  weekStartDate: LastValue<Date>
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
  firstDayIndex: LastValue<number>
  daysInWeekTasks: LastValue<string[][]>
  daysInWeekTasksSuggested: LastValue<boolean[]>
  daysInWeekTasksAskedToSuggest: LastValue<boolean[]>
  daysInWeekTasksConfirmedToSuggest: LastValue<boolean[]>
  daysInWeekTasksConfirmedAsked: LastValue<boolean[]>
  daysInWeekTasksConfirmed: LastValue<(boolean | null)[]>
  nextDayIndex: LastValue<number>
  allDaysInWeekTasksConfirmed: LastValue<boolean>
  calendarEvents: LastValue<string[]>
  motivationMessage: LastValue<string>
  flowIsDone: LastValue<boolean>
  messages: LastValue<Messages>
}

type NodeOutput = Partial<WeeklyPlanningState> | NodeType | typeof END

const WeeklyPlanningAnnotation = Annotation.Root({
  weekStartDate: Annotation<Date>(),
  userInfo: Annotation<User>(),
  conversationId: Annotation<ObjectId>(),
  hasLastWeekPlan: Annotation<boolean>(),
  lastWeekPlan: Annotation<string[]>(),
  planType: Annotation<WeekPlanType>(),
  planTypeAsked: Annotation<boolean>(),
  hasRoutineOrHabits: Annotation<boolean>(),
  habits: Annotation<string[]>(),
  habitsAsked: Annotation<boolean>(),
  weekToDoTasks: Annotation<string[]>(),
  weekToDoTasksAsked: Annotation<boolean>(),
  weekToDoTasksConfirmAsked: Annotation<boolean>(),
  weekToDoTasksConfirmed: Annotation<boolean>(),
  firstDayCoreTasks: Annotation<string[]>(),
  firstDayIndex: Annotation<number>(),
  daysInWeekTasks: Annotation<string[][]>(),
  daysInWeekTasksSuggested: Annotation<boolean[]>(),
  daysInWeekTasksAskedToSuggest: Annotation<boolean[]>(),
  daysInWeekTasksConfirmedToSuggest: Annotation<boolean[]>(),
  daysInWeekTasksConfirmedAsked: Annotation<boolean[]>(),
  daysInWeekTasksConfirmed: Annotation<(boolean | null)[]>(),
  nextDayIndex: Annotation<number>(),
  allDaysInWeekTasksConfirmed: Annotation<boolean>(),
  calendarEvents: Annotation<string[]>(),
  motivationMessage: Annotation<string>(),
  flowIsDone: Annotation<boolean>(),
  ...MessagesAnnotation.spec,
})

type UpdateState = {
  target: string,
  targetType: string,
  targetIndex?: number,
  value: any
}