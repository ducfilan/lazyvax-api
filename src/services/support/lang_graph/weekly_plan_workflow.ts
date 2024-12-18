import { StateGraph, START, END, CompiledStateGraph, LastValue, Messages, StateDefinition, UpdateType, Annotation, MessagesAnnotation } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { User } from '@/entities/User';
import {
  dateInTimeZone,
  formatDateToWeekDay,
  formatDateToWeekDayAndDate,
  formatDateToWeekDayAndDateTime,
  formatDateToWeekDayAndTime,
  getWeekInfo,
  isEvening,
  startOfDayInTimeZone,
} from '@/common/utils/dateUtils';
import { addDays, getDay, isSameWeek, startOfDay } from 'date-fns';
import { WeekPlanType } from '@/common/types/types';
import { PlanTypeWeekInteractive } from '@common/consts/constants';
import {
  MessageTypeAskForNextDayTasks,
  MessageTypeAskForRoutine,
  MessageTypeAskForTimezone,
  MessageTypeAskForWeekToDoTasks,
  MessageTypeAskToConfirmFirstDayTasks,
  MessageTypeAskToConfirmNextDayTasks,
  MessageTypeAskToConfirmWeekToDoTasks,
  MessageTypeAskToGenerateWeekPlan,
  MessageTypeAskToMoveToNextWeek,
  MessageTypePlainText,
  MessageTypeTextWithEvents
} from '@common/consts/message-types';
import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
import { DatabaseName, getDbClient } from '@/common/configs/mongodb-client.config';
import { ObjectId } from 'mongodb';
import { getConversationById } from '@/services/api/conversations.services';
import { RunnableConfig } from '@langchain/core/runnables';
import { dayTasksSuggestInstruction, dayTasksSuggestionFirstDayTemplate, dayTasksSuggestTemplate, systemMessageShort, userInformationPrompt } from './prompts';
import logger from '@/common/logger';
import { Conversation } from '@/entities/Conversation';
import { getModel, ModelNameChatGPT4o } from './model_repo';
import { sendMessage } from '@/services/utils/conversation.utils';
import { getCalendarEvents, getLastWeekPlan, getRoutineAndHabits } from './utils';
import { GoalTypeLong, GoalTypeShort } from '@/common/consts/shared';
import { getGoalsByUserId } from '@/services/api/goals.services';

export class WeeklyPlanningWorkflow {
  private checkpointer: MongoDBSaver;
  private graph: CompiledStateGraph<WeeklyPlanningState, UpdateType<WeeklyPlanStateType>, NodeType, WeeklyPlanStateType, WeeklyPlanStateType, StateDefinition>;

  constructor() {
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
      .addConditionalEdges(START, this.decideStartFlow)
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

  private async checkLastWeekPlan(state: WeeklyPlanningState): Promise<NodeOutput> {
    // TODO: Maybe this week so far if planning on Sunday.
    logger.debug(`checkLastWeekPlan`)

    const lastWeekPlan = await getLastWeekPlan(
      state.userInfo._id,
      new Date(state.weekStartDate),
      state.userInfo.preferences?.timezone
    )

    return {
      lastWeekPlan,
      hasLastWeekPlan: lastWeekPlan.length > 0
    }
  }

  private async selectPlanType(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`selectPlanType`)
    if (state.planType || state.planTypeAsked) return

    if (!state.hasLastWeekPlan) {
      await sendMessage(state.conversationId, "We will plan interactively.", MessageTypeAskToGenerateWeekPlan)

      return {
        planType: PlanTypeWeekInteractive,
      }
    }

    await sendMessage(state.conversationId, "Generate your weekly plan?", MessageTypeAskToGenerateWeekPlan)
    return {
      planTypeAsked: true,
    }
  }

  private async checkRoutineAndHabits(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`checkRoutineAndHabits`)
    const habits = await getRoutineAndHabits(state.userInfo._id)

    return {
      hasRoutineOrHabits: habits.length > 0,
      habits,
    }
  }

  private async askForHabits(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`askForHabits`)
    if (state.hasRoutineOrHabits || state.habitsAsked) {
      return {}
    }

    await sendMessage(state.conversationId, "What is your routine? Please go to Habits page to check your habits.", MessageTypeAskForRoutine) // TODO: i18n.
    return {
      habitsAsked: true,
    }
  }

  private async checkCalendarEvents(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`checkCalendarEvents`)
    const weekInfo = getWeekInfo(new Date(state.weekStartDate), state.userInfo.preferences?.timezone)
    const calendarEvents = await getCalendarEvents(
      state.userInfo._id,
      weekInfo.weekStartDate,
      weekInfo.weekEndDate,
      state.userInfo.preferences?.timezone
    )

    return {
      calendarEvents,
    }
  }

  private async checkWeekToDoTasks(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`checkWeekToDoTasks`)
    if (state.weekToDoTasks?.length > 0) return {}

    const todoTasks = state.conversation?.meta?.meta?.todoTasks || []

    return {
      weekToDoTasks: todoTasks?.map(t => {
        const dueDate = t.dueDate ? formatDateToWeekDayAndTime(t.dueDate, state.userInfo.preferences?.timezone) : "";
        const status = t.completed ? "Done" : "Not done";
        return `${t.title} - ${dueDate}: ${status}`;
      }),
    }
  }

  private async askForWeekToDoTasks(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`askForWeekToDoTasks`)
    if (state.weekToDoTasksAsked || state.weekToDoTasks?.length > 0) return {}

    await sendMessage(state.conversationId, "What are your must do tasks in this week?", MessageTypeAskForWeekToDoTasks) // TODO: i18n.
    return {
      weekToDoTasksAsked: true,
    }
  }

  private async confirmWeekToDoTasks(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`confirmWeekToDoTasks`)
    if (state.weekToDoTasksConfirmAsked || state.weekToDoTasksConfirmed) return {}

    await sendMessage(state.conversationId, "Are you satisfied with your must do tasks?", MessageTypeAskToConfirmWeekToDoTasks) // TODO: i18n.
    return {
      weekToDoTasksConfirmAsked: true,
    }
  }

  private async getUserTimezone(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`getUserTimezone: ${state.userInfo.preferences?.timezone}`)
    if (!state.userInfo.preferences?.timezone) {
      await sendMessage(state.conversationId, "What is your timezone?", MessageTypeAskForTimezone) // TODO: i18n.
    }

    return {}
  }

  private async generateFirstDayTasks(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`generateFirstDayTasks: ${state.firstDayIndex}`)
    if (state.planningIsDone || !state.weekToDoTasksConfirmed) return {}

    // TODO: May generate for today instead of tomorrow if it's not too late, or maybe ask for confirmation.
    // TODO: What if it's Sunday?
    const newState: Partial<WeeklyPlanningState> = {}
    const timezone = state.userInfo.preferences?.timezone
    const now = new Date()
    const nowInTimeZone = dateInTimeZone(now, timezone)
    const weekStartDate = new Date(state.weekStartDate)
    const weekStartDateInTimeZone = dateInTimeZone(weekStartDate, timezone)
    const isPlanThisWeek = isSameWeek(nowInTimeZone, weekStartDateInTimeZone, { weekStartsOn: 1 }) // TODO: Week starts on Monday.

    // Calculate initial first day index (0 = Monday, 6 = Sunday)
    let firstDayIndex = state.firstDayIndex ?? (isPlanThisWeek ? ((getDay(nowInTimeZone) + 6) % 7) : 0)

    // Set initial planning date/time
    let dateTimeToStartPlanning = isPlanThisWeek
      ? nowInTimeZone
      : startOfDayInTimeZone(weekStartDate, timezone)

    // Check if it's late and adjust planning time if needed
    const isLateOnToday = isEvening(now, timezone)
    if (isLateOnToday && isPlanThisWeek && !state.isLateTodayNoticeInformed) {
      await sendMessage(
        state.conversationId,
        "It's getting late. We will plan for tomorrow.",
        MessageTypePlainText
      )
      newState.isLateTodayNoticeInformed = true
      firstDayIndex += 1

      if (isPlanThisWeek) {
        dateTimeToStartPlanning = startOfDay(addDays(dateTimeToStartPlanning, 1))
      }
    }

    if (firstDayIndex > 6 && !state.isWeekOverNoticeInformed) {
      await sendMessage(state.conversationId, "This week is over. Let's move to next week.", MessageTypeAskToMoveToNextWeek) // TODO: AI + i18n.
      newState.isWeekOverNoticeInformed = true
      newState.planningIsDone = true
      return newState
    }

    if (state.daysInWeekTasksSuggested[firstDayIndex]) return newState

    await sendMessage(state.conversationId, `Generating tasks for ${formatDateToWeekDay(addDays(new Date(state.weekStartDate), firstDayIndex), timezone)}...`, MessageTypePlainText)

    const prompt = await ChatPromptTemplate.fromMessages([
      ["system", systemMessageShort],
      ["human", dayTasksSuggestionFirstDayTemplate],
    ]).formatMessages({
      now: formatDateToWeekDayAndDateTime(dateTimeToStartPlanning),
      user_info: userInformationPrompt(state.userInfo),
      habit: state.habits?.map(h => `- ${h}`).join('\n'),
      weekToDoTask: state.weekToDoTasks?.map(t => `- ${t}`).join('\n'),
      calendarLastWeekEvents: state.lastWeekPlan?.map(e => `- ${e}`).join('\n'),
      calendarEvents: state.calendarEvents?.map(e => `- ${e}`).join('\n'),
      instructions: dayTasksSuggestInstruction(timezone, "today"),
    })
    logger.debug(`generateFirstDayTasks prompt: ${JSON.stringify(prompt)}`)
    const result = await getModel(ModelNameChatGPT4o).invoke(prompt)
    logger.debug(`generateFirstDayTasks result: ${result.content}`)

    await sendMessage(state.conversationId, result.content as string, MessageTypeTextWithEvents)

    const daysInWeekTasksSuggested = [...state.daysInWeekTasksSuggested]
    daysInWeekTasksSuggested[firstDayIndex] = true

    const daysInWeekTasksAskedToSuggest = [...state.daysInWeekTasksAskedToSuggest]
    daysInWeekTasksAskedToSuggest[firstDayIndex] = true

    const daysInWeekTasksConfirmedToSuggest = [...state.daysInWeekTasksConfirmedToSuggest]
    daysInWeekTasksConfirmedToSuggest[firstDayIndex] = true

    return {
      ...newState,
      firstDayIndex,
      daysInWeekTasksSuggested,
      daysInWeekTasksAskedToSuggest,
      daysInWeekTasksConfirmedToSuggest,
    }
  }

  private async checkFirstDayTasksSatisfied(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`checkFirstDayTasksSatisfied: ${state.firstDayIndex}`)
    if (
      !state.daysInWeekTasksSuggested[state.firstDayIndex] ||
      state.daysInWeekTasksConfirmedAsked[state.firstDayIndex] ||
      state.planningIsDone
    ) return {}

    const timezone = state.userInfo.preferences?.timezone
    const firstDayDate = addDays(new Date(state.weekStartDate), state.firstDayIndex)
    if (!state.daysInWeekTasksConfirmedAsked[state.firstDayIndex]) {
      const content = {
        index: state.firstDayIndex,
        content: `Are you satisfied with your tasks for ${formatDateToWeekDay(firstDayDate, timezone)}?`,
      }
      await sendMessage(state.conversationId, JSON.stringify(content), MessageTypeAskToConfirmFirstDayTasks) // TODO: i18n.

      const daysInWeekTasksConfirmedAsked = [...state.daysInWeekTasksConfirmedAsked]
      daysInWeekTasksConfirmedAsked[state.firstDayIndex] = true

      return {
        daysInWeekTasksConfirmedAsked,
      }
    }

    if (!state.daysInWeekTasksConfirmed[state.firstDayIndex]) {
      return {}
    }
  }

  private async generateMoreDays(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`generateMoreDays: ${state.daysInWeekTasksConfirmed}`)
    if (state.planningIsDone) return {}

    let notConfirmedDayIndex = state.daysInWeekTasksConfirmed.findIndex((confirmation, i) => confirmation === null && i > state.firstDayIndex)
    if (notConfirmedDayIndex === -1 && !state.motivationMessage) {
      return {
        allDaysInWeekTasksConfirmed: true,
        motivationMessage: "This is motivation message lol. You have confirmed all tasks for this week. Enjoy your week!", // TODO: AI + i18n.
      }
    }

    const timezone = state.userInfo.preferences?.timezone
    if (!state.daysInWeekTasksAskedToSuggest[notConfirmedDayIndex]) {
      const content = {
        content: `Do you want to have suggestions for ${formatDateToWeekDay(addDays(new Date(state.weekStartDate), notConfirmedDayIndex), timezone)}?`,
        index: notConfirmedDayIndex,
      }
      await sendMessage(state.conversationId, JSON.stringify(content), MessageTypeAskForNextDayTasks) // TODO: i18n.

      const daysInWeekTasksAskedToSuggest = [...state.daysInWeekTasksAskedToSuggest]
      daysInWeekTasksAskedToSuggest[notConfirmedDayIndex] = true
      return {
        daysInWeekTasksAskedToSuggest,
        nextDayIndex: notConfirmedDayIndex,
      }
    }

    if (!state.daysInWeekTasksConfirmedToSuggest[state.nextDayIndex]) {
      return {}
    }

    if (state.daysInWeekTasksSuggested[notConfirmedDayIndex]) {
      return {}
    }

    await sendMessage(
      state.conversationId,
      `Generating tasks for ${formatDateToWeekDay(addDays(new Date(state.weekStartDate), notConfirmedDayIndex), timezone)}...`,
      MessageTypePlainText
    )

    const goals = await getGoalsByUserId(state.userInfo._id)
    const shortTermGoals = goals.filter(o => o.type === GoalTypeShort).map(o => o.title)
    const longTermGoals = goals.filter(o => o.type === GoalTypeLong).map(o => o.title)

    const prompt = await ChatPromptTemplate.fromMessages([
      ["system", systemMessageShort],
      ["human", dayTasksSuggestTemplate],
    ]).formatMessages({
      now: formatDateToWeekDayAndDate(new Date(), timezone),
      user_info: userInformationPrompt(state.userInfo),
      habit: state.habits?.map(h => `- ${h}`).join('\n'),
      shortTermGoals: shortTermGoals?.map(t => `- ${t}`).join('\n'),
      longTermGoals: longTermGoals?.map(t => `- ${t}`).join('\n'),
      calendarLastWeekEvents: state.lastWeekPlan?.map(e => `- ${e}`).join('\n'),
      weekToDoTask: state.weekToDoTasks?.map(t => `- ${t}`).join('\n'),
      calendarEvents: state.calendarEvents?.map(e => `- ${e}`).join('\n'),
      dislikeActivities: state.dislikeActivities.size > 0 ? [...state.dislikeActivities].map(a => `- ${a}`).join('\n') : "Not specified",
      longTermMemory: state.userInfo.aiMemory,
      weekMemory: "",
      dayMemory: "",
      instructions: dayTasksSuggestInstruction(timezone, formatDateToWeekDayAndDate(addDays(new Date(state.weekStartDate), notConfirmedDayIndex), timezone)),
    })
    logger.debug(`generateMoreDays prompt: ${JSON.stringify(prompt)}`)
    const result = await getModel(ModelNameChatGPT4o).invoke(prompt)
    logger.debug(`generateMoreDays result: ${result.content}`)

    await sendMessage(state.conversationId, result.content as string, MessageTypeTextWithEvents)

    const daysInWeekTasksSuggested = [...state.daysInWeekTasksSuggested]
    daysInWeekTasksSuggested[notConfirmedDayIndex] = true

    if (!state.daysInWeekTasksConfirmedAsked[notConfirmedDayIndex]) {
      const content = {
        index: notConfirmedDayIndex,
        content: `Are you satisfied with your tasks for ${formatDateToWeekDay(addDays(new Date(state.weekStartDate), notConfirmedDayIndex), timezone)}?`,
      }
      await sendMessage(state.conversationId, JSON.stringify(content), MessageTypeAskToConfirmNextDayTasks) // TODO: i18n.

      const daysInWeekTasksConfirmedAsked = [...state.daysInWeekTasksConfirmedAsked]
      daysInWeekTasksConfirmedAsked[notConfirmedDayIndex] = true

      return {
        daysInWeekTasksConfirmedAsked,
        daysInWeekTasksSuggested,
        nextDayIndex: notConfirmedDayIndex,
      }
    }

    return {
      daysInWeekTasksSuggested,
      nextDayIndex: notConfirmedDayIndex,
    }
  }

  private async motivateUser(state: WeeklyPlanningState): Promise<NodeOutput> {
    logger.debug(`motivateUser`)

    if (state.motivationMessage && !state.flowIsDone) {
      await sendMessage(state.conversationId, state.motivationMessage, MessageTypePlainText)

      return {
        flowIsDone: true,
      }
    }

    return {}
  }

  private decideStartFlow(state: WeeklyPlanningState) {
    return state.flowIsDone ? END : 'checkLastWeekPlan'
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
    if (state.planningIsDone) return 'motivateUser'

    if (state.daysInWeekTasksAskedToSuggest[state.nextDayIndex] && !state.daysInWeekTasksConfirmedToSuggest[state.nextDayIndex]) {
      return END
    }

    if (state.daysInWeekTasksConfirmedAsked[state.nextDayIndex] && !state.daysInWeekTasksConfirmed[state.nextDayIndex]) {
      return END
    }

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
      daysInWeekTasksConfirmedAsked: [false, false, false, false, false, false, false],
      daysInWeekTasksAskedToSuggest: [false, false, false, false, false, false, false],
      daysInWeekTasksSuggested: [false, false, false, false, false, false, false],
      daysInWeekTasksConfirmedToSuggest: [false, false, false, false, false, false, false],
      daysInWeekTasksConfirmed: [null, null, null, null, null, null, null],
      dislikeActivities: new Set(),
    }

    try {
      if (!lastState.conversation) {
        const conversation = await getConversationById(initialState.conversationId)
        if (!conversation) {
          throw new Error(`Conversation not found: ${initialState.conversationId}`)
        }

        if (!conversation.meta?.meta?.startDate) {
          throw new Error(`Invalid conversation, no startDate for the week`)
        }

        lastState.conversation = conversation
        lastState.weekStartDate = conversation.meta?.meta?.startDate
      }

      if (updateState) {
        if (updateState.targetType === 'array') {
          if (updateState.targetIndex !== undefined) {
            lastState[updateState.target][updateState.targetIndex] = updateState.value
          } else {
            (lastState[updateState.target] as string[]).push(updateState.value)
          }
        } else if (updateState.targetType === 'set') {
          (lastState[updateState.target] as Set<string>).add(updateState.value)
        } else {
          lastState[updateState.target] = updateState.value
        }
      }

      const finalState = await this.graph.invoke({ ...lastState, ...initialState }, config);
      return finalState;
    } catch (error) {
      logger.error(`Error running workflow: ${error}`);
    }
  }
}

type WeeklyPlanningState = {
  weekStartDate: Date
  userInfo: User
  conversationId: ObjectId
  conversation: Conversation | null
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
  isLateTodayNoticeInformed: boolean
  isWeekOverNoticeInformed: boolean
  dislikeActivities: Set<string>
  daysInWeekTasksSuggested: boolean[]
  daysInWeekTasksAskedToSuggest: boolean[]
  daysInWeekTasksConfirmedToSuggest: boolean[]
  daysInWeekTasksConfirmedAsked: boolean[]
  daysInWeekTasksConfirmed: (boolean | null)[]
  nextDayIndex: number
  allDaysInWeekTasksConfirmed: boolean
  calendarEvents: string[]
  motivationMessage: string | null
  planningIsDone: boolean
  flowIsDone: boolean
  messages: BaseMessage[]
}

type NodeType = typeof START | "checkLastWeekPlan" | "selectPlanType" | "checkRoutineAndHabits" | "askForHabits" | "checkWeekToDoTasks" | "askForWeekToDoTasks" | "confirmWeekToDoTasks" | "getUserTimezone" | "checkCalendarEvents" | "generateFirstDayTasks" | "checkFirstDayTasksSatisfied" | "generateMoreDays" | "motivateUser"

type WeeklyPlanStateType = {
  weekStartDate: LastValue<Date>
  userInfo: LastValue<User>
  conversationId: LastValue<ObjectId>
  conversation: LastValue<Conversation | null>
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
  isLateTodayNoticeInformed: LastValue<boolean>
  isWeekOverNoticeInformed: LastValue<boolean>
  dislikeActivities: LastValue<Set<string>>
  daysInWeekTasksSuggested: LastValue<boolean[]>
  daysInWeekTasksAskedToSuggest: LastValue<boolean[]>
  daysInWeekTasksConfirmedToSuggest: LastValue<boolean[]>
  daysInWeekTasksConfirmedAsked: LastValue<boolean[]>
  daysInWeekTasksConfirmed: LastValue<(boolean | null)[]>
  nextDayIndex: LastValue<number>
  allDaysInWeekTasksConfirmed: LastValue<boolean>
  calendarEvents: LastValue<string[]>
  motivationMessage: LastValue<string | null>
  planningIsDone: LastValue<boolean>
  flowIsDone: LastValue<boolean>
  messages: LastValue<Messages>
}

type NodeOutput = Partial<WeeklyPlanningState>

const WeeklyPlanningAnnotation = Annotation.Root({
  weekStartDate: Annotation<Date>(),
  userInfo: Annotation<User>(),
  conversationId: Annotation<ObjectId>(),
  conversation: Annotation<Conversation | null>(),
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
  isLateTodayNoticeInformed: Annotation<boolean>(),
  isWeekOverNoticeInformed: Annotation<boolean>(),
  dislikeActivities: Annotation<Set<string>>(),
  daysInWeekTasksSuggested: Annotation<boolean[]>(),
  daysInWeekTasksAskedToSuggest: Annotation<boolean[]>(),
  daysInWeekTasksConfirmedToSuggest: Annotation<boolean[]>(),
  daysInWeekTasksConfirmedAsked: Annotation<boolean[]>(),
  daysInWeekTasksConfirmed: Annotation<(boolean | null)[]>(),
  nextDayIndex: Annotation<number>(),
  allDaysInWeekTasksConfirmed: Annotation<boolean>(),
  calendarEvents: Annotation<string[]>(),
  motivationMessage: Annotation<string | null>(),
  planningIsDone: Annotation<boolean>(),
  flowIsDone: Annotation<boolean>(),
  ...MessagesAnnotation.spec,
})

type UpdateState = {
  target: string,
  targetType: string,
  targetIndex?: number,
  value: any
}