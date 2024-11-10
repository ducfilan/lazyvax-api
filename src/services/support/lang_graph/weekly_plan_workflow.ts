import { StateGraph, START, END, CompiledStateGraph, LastValue, Messages, StateDefinition, UpdateType, Annotation, MessagesAnnotation } from '@langchain/langgraph';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { User } from '@/entities/User';
import { getEvents } from '@/services/api/events.services';
import { formatDateToWeekDay, formatDateToWeekDayAndDate, formatDateToWeekDayAndTime, getWeekInfo } from '@/common/utils/dateUtils';
import { addDays, endOfDay, getDay, startOfDay, startOfWeek } from 'date-fns';
import { WeekPlanType } from '@/common/types/types';
import { BotUserId, BotUserName, DaysOfWeekMap, PlanTypeWeekInteractive } from '@common/consts/constants';
import { MessageTypeAskForNextDayTasks, MessageTypeAskForRoutine, MessageTypeAskForTimezone, MessageTypeAskForWeekToDoTasks, MessageTypeAskToConfirmFirstDayCoreTasks, MessageTypeAskToConfirmNextDayTasks, MessageTypeAskToConfirmWeekToDoTasks, MessageTypeAskToGenerateWeekPlan, MessageTypePlainText, MessageTypeTextWithEvents } from '@common/consts/message-types';
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

  private async checkLastWeekPlan(state: WeeklyPlanningState): Promise<NodeOutput> {
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
      const chatMessage = this.createChatMessage(state.conversationId, "We will plan interactively.", MessageTypeAskToGenerateWeekPlan)
      const messageId = await saveMessage(chatMessage)
      chatMessage._id = messageId
      emitConversationMessage(state.conversationId.toHexString(), chatMessage)

      return {
        planType: PlanTypeWeekInteractive,
      }
    }

    const chatMessage = this.createChatMessage(state.conversationId, "Generate your weekly plan?", MessageTypeAskToGenerateWeekPlan) // TODO: i18n.
    const messageId = await saveMessage(chatMessage)
    chatMessage._id = messageId
    emitConversationMessage(state.conversationId.toHexString(), chatMessage)
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

    const chatMessage = this.createChatMessage(state.conversationId, "What is your routine? Please go to Habits page to check your habits.", MessageTypeAskForRoutine) // TODO: i18n.
    const messageId = await saveMessage(chatMessage)
    chatMessage._id = messageId
    emitConversationMessage(state.conversationId.toHexString(), chatMessage)
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

    const chatMessage = this.createChatMessage(state.conversationId, "What are your must do tasks in this week?", MessageTypeAskForWeekToDoTasks) // TODO: i18n.
    const messageId = await saveMessage(chatMessage)
    chatMessage._id = messageId
    emitConversationMessage(state.conversationId.toHexString(), chatMessage)
    return {
      weekToDoTasksAsked: true,
    }
  }

  private async confirmWeekToDoTasks(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`confirmWeekToDoTasks`)
    if (state.weekToDoTasksConfirmAsked || state.weekToDoTasksConfirmed) return {}

    const chatMessage = this.createChatMessage(state.conversationId, "Are you satisfied with your must do tasks?", MessageTypeAskToConfirmWeekToDoTasks) // TODO: i18n.
    const messageId = await saveMessage(chatMessage)
    chatMessage._id = messageId
    emitConversationMessage(state.conversationId.toHexString(), chatMessage)
    return {
      weekToDoTasksConfirmAsked: true,
    }
  }

  private async getUserTimezone(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`getUserTimezone: ${state.userInfo.preferences?.timezone}`)
    if (!state.userInfo.preferences?.timezone) {
      const chatMessage = this.createChatMessage(state.conversationId, "What is your timezone?", MessageTypeAskForTimezone) // TODO: i18n.
      const messageId = await saveMessage(chatMessage)
      chatMessage._id = messageId
      emitConversationMessage(state.conversationId.toHexString(), chatMessage)
    }

    return {}
  }

  private async generateFirstDayTasks(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`generateFirstDayTasks: ${state.firstDayIndex}`)
    // TODO: May generate for today instead of tomorrow if it's not too late, or maybe ask for confirmation.
    // TODO: What if it's Sunday?
    let tomorrowIndex = state.firstDayIndex ?? (getDay(new Date()) + 6) % 7 + 1 // TODO: Start on Monday, what if start on Sunday.
    const isSunday = tomorrowIndex === 7
    if (isSunday) { // TODO: More sophisticated scenarios.
      tomorrowIndex = 0
    }
    if (!state.weekToDoTasksConfirmed || state.daysInWeekTasksSuggested[tomorrowIndex]) return {}

    const chatMessageAnnounceGenerate = this.createChatMessage(state.conversationId, `Generating tasks for ${formatDateToWeekDay(addDays(state.weekStartDate, tomorrowIndex), state.userInfo.preferences?.timezone)}...`, MessageTypePlainText)
    const messageIdAnnounceGenerate = await saveMessage(chatMessageAnnounceGenerate)
    chatMessageAnnounceGenerate._id = messageIdAnnounceGenerate
    emitConversationMessage(state.conversationId.toHexString(), chatMessageAnnounceGenerate)

    const prompt = await ChatPromptTemplate.fromMessages([
      ["system", systemMessageShort],
      ["human", `### Context: ###\nToday is ${formatDateToWeekDayAndDate(new Date(), state.userInfo.preferences?.timezone)}.\n{user_info}\nHabits:\n{habit}\nTo do tasks this week:\n{weekToDoTask}\nWhat's on calendar this week:\n{calendarEvents}\n### Instructions: ###\n{instructions}`],
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

    const chatMessage = this.createChatMessage(state.conversationId, result.content, MessageTypeTextWithEvents)
    const messageId = await saveMessage(chatMessage)
    chatMessage._id = messageId
    emitConversationMessage(state.conversationId.toHexString(), chatMessage)

    const daysInWeekTasksSuggested = [...state.daysInWeekTasksSuggested]
    daysInWeekTasksSuggested[tomorrowIndex] = true

    const daysInWeekTasksAskedToSuggest = [...state.daysInWeekTasksAskedToSuggest]
    daysInWeekTasksAskedToSuggest[tomorrowIndex] = true

    return {
      firstDayIndex: tomorrowIndex,
      daysInWeekTasksSuggested,
      daysInWeekTasksAskedToSuggest
    }
  }

  private async checkFirstDayTasksSatisfied(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`checkFirstDayTasksSatisfied: ${state.firstDayIndex}`)
    if (!state.daysInWeekTasksSuggested[state.firstDayIndex] || state.daysInWeekTasksConfirmedAsked[state.firstDayIndex]) return {}

    if (!state.daysInWeekTasksConfirmedAsked[state.firstDayIndex]) {
      const content = {
        index: state.firstDayIndex,
        content: `Are you satisfied with your tasks for ${formatDateToWeekDay(addDays(state.weekStartDate, state.firstDayIndex), state.userInfo.preferences?.timezone)}?`,
      }
      const chatMessage = this.createChatMessage(state.conversationId, JSON.stringify(content), MessageTypeAskToConfirmFirstDayCoreTasks) // TODO: i18n.
      const messageId = await saveMessage(chatMessage)
      chatMessage._id = messageId
      emitConversationMessage(state.conversationId.toHexString(), chatMessage)

      const daysInWeekTasksConfirmedAsked = [...state.daysInWeekTasksConfirmedAsked]
      daysInWeekTasksConfirmedAsked[state.firstDayIndex] = true

      return {
        daysInWeekTasksConfirmedAsked,
      }
    }

    if (!state.daysInWeekTasksConfirmed[state.firstDayIndex]) {
      return {}
    }

    const theDayAfterFirstDay = addDays(state.weekStartDate, state.firstDayIndex + 1)

    const firstDayEvents = await getEvents({
      userId: state.userInfo._id,
      from: startOfDay(theDayAfterFirstDay),
      to: endOfDay(theDayAfterFirstDay),
    })

    const daysInWeekTasks = [...state.daysInWeekTasks ?? [[], [], [], [], [], [], []]]
    daysInWeekTasks[state.firstDayIndex] = firstDayEvents?.map(e => `${formatDateToWeekDayAndTime(e.startDate, state.userInfo.preferences?.timezone)} to ${formatDateToWeekDayAndTime(e.endDate, state.userInfo.preferences?.timezone)}: ${e.title}${e.description ? " (" + e.description + ")" : ""}`) ?? []
    return {
      daysInWeekTasks,
    }
  }

  private async generateMoreDays(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`generateMoreDays: ${state.firstDayIndex}`)
    let nextDayIndex = state.daysInWeekTasksConfirmed.findIndex((confirmation, i) => confirmation === null && i > state.firstDayIndex)
    if (nextDayIndex === -1 && !state.motivationMessage) {
      return {
        allDaysInWeekTasksConfirmed: true,
        motivationMessage: "This is motivation message lol. You have confirmed all tasks for this week. Enjoy your week!", // TODO: AI + i18n.
      }
    }

    if (!state.daysInWeekTasksAskedToSuggest[nextDayIndex]) {
      const content = {
        content: `Do you want to have suggestions for ${formatDateToWeekDay(addDays(state.weekStartDate, nextDayIndex), state.userInfo.preferences?.timezone)}?`,
        index: nextDayIndex,
      }
      const chatMessage = this.createChatMessage(state.conversationId, JSON.stringify(content), MessageTypeAskForNextDayTasks) // TODO: i18n.
      const messageId = await saveMessage(chatMessage)
      chatMessage._id = messageId
      emitConversationMessage(state.conversationId.toHexString(), chatMessage)

      const daysInWeekTasksAskedToSuggest = [...state.daysInWeekTasksAskedToSuggest]
      daysInWeekTasksAskedToSuggest[nextDayIndex] = true
      return {
        daysInWeekTasksAskedToSuggest
      }
    }

    if (!state.daysInWeekTasksConfirmedToSuggest[nextDayIndex]) {
      return {}
    }

    if (!state.daysInWeekTasksConfirmedAsked[nextDayIndex]) {
      const content = {
        index: nextDayIndex,
        content: `Are you satisfied with your tasks for ${formatDateToWeekDay(addDays(state.weekStartDate, nextDayIndex), state.userInfo.preferences?.timezone)}?`,
      }
      const chatMessage = this.createChatMessage(state.conversationId, JSON.stringify(content), MessageTypeAskToConfirmNextDayTasks) // TODO: i18n.
      const messageId = await saveMessage(chatMessage)
      chatMessage._id = messageId
      emitConversationMessage(state.conversationId.toHexString(), chatMessage)

      const daysInWeekTasksConfirmedAsked = [...state.daysInWeekTasksConfirmedAsked]
      daysInWeekTasksConfirmedAsked[nextDayIndex] = true

      return {
        daysInWeekTasksConfirmedAsked,
      }
    }

    if (state.daysInWeekTasksSuggested[nextDayIndex]) {
      return {}
    }

    const chatMessageAnnounceGenerate = this.createChatMessage(state.conversationId, `Generating tasks for ${formatDateToWeekDay(addDays(state.weekStartDate, nextDayIndex), state.userInfo.preferences?.timezone)}...`, MessageTypePlainText)
    const messageIdAnnounceGenerate = await saveMessage(chatMessageAnnounceGenerate)
    chatMessageAnnounceGenerate._id = messageIdAnnounceGenerate
    emitConversationMessage(state.conversationId.toHexString(), chatMessageAnnounceGenerate)

    const prompt = await ChatPromptTemplate.fromMessages([
      ["system", systemMessageShort],
      ["human", `### Context: ###\nToday is ${formatDateToWeekDayAndDate(new Date(), state.userInfo.preferences?.timezone)}.\n{user_info}\nHabits:\n{habit}\nTo do tasks this week:\n{weekToDoTask}\nWhat's on calendar this week:\n{calendarEvents}\n### Instructions: ###\n{instructions}`],
    ]).formatMessages({
      user_info: userInformationPrompt(state.userInfo),
      habit: state.habits?.map(h => `- ${h}`).join('\n'),
      weekToDoTask: state.weekToDoTasks?.map(t => `- ${t}`).join('\n'),
      calendarEvents: state.calendarEvents?.map(e => `- ${e}`).join('\n'),
      instructions: dayCoreTasksInstruction(state.userInfo.preferences?.timezone),
    })
    logger.debug(`generateMoreDays: ${prompt}`)
    const result = await this.model.invoke(prompt)
    logger.debug(`generateMoreDays: ${result.content}`)

    const chatMessage = this.createChatMessage(state.conversationId, result.content, MessageTypeTextWithEvents)
    const messageId = await saveMessage(chatMessage)
    chatMessage._id = messageId
    emitConversationMessage(state.conversationId.toHexString(), chatMessage)

    const daysInWeekTasksSuggested = [...state.daysInWeekTasksSuggested]
    daysInWeekTasksSuggested[nextDayIndex] = true

    return {
      daysInWeekTasksSuggested,
    }
  }

  private async motivateUser(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`motivateUser`)

    const chatMessage = this.createChatMessage(state.conversationId, state.motivationMessage, MessageTypePlainText)
    const messageId = await saveMessage(chatMessage)
    chatMessage._id = messageId
    emitConversationMessage(state.conversationId.toHexString(), chatMessage)

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
    return state.daysInWeekTasksConfirmed[state.firstDayIndex] ? 'motivateUser' : 'generateMoreDays';
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
  allDaysInWeekTasksConfirmed: Annotation<boolean>(),
  nextDayIndex: Annotation<number>(),
  calendarEvents: Annotation<string[]>(),
  motivationMessage: Annotation<string>(),
  ...MessagesAnnotation.spec,
})

type UpdateState = {
  target: string,
  targetType: string,
  targetIndex?: number,
  value: any
}