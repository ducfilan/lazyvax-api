import { StateGraph, START, END, CompiledStateGraph, LastValue, Messages, StateDefinition, UpdateType, Annotation, MessagesAnnotation } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { User } from '@/entities/User';
import {
  dateInTimeZone,
  endOfDayInTimeZone,
  formatDateToWeekDayAndDateTime,
  formatDateToWeekDayAndTime,
  getWeekInfo,
  isEvening,
  startOfDayInTimeZone,
} from '@/common/utils/dateUtils';
import { isSameDay, isSameWeek } from 'date-fns';
import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
import { DatabaseName, getDbClient } from '@/common/configs/mongodb-client.config';
import { ObjectId } from 'mongodb';
import { getConversationById } from '@/services/api/conversations.services';
import { RunnableConfig } from '@langchain/core/runnables';
import { dayActivitiesArrangeInstruction, dayActivitiesArrangeTemplate, dayActivitiesSuggestionInstruction, dayTasksSuggestTemplate, systemMessageShort, userInformationPrompt } from './prompts';
import logger from '@/common/logger';
import { Conversation } from '@/entities/Conversation';
import { getModel, ModelNameChatGPT4o } from './model_repo';
import { getCalendarEvents, getLastWeekPlan, getRoutineAndHabits } from './utils';
import { checkLastWeekPlanStep, checkRoutineAndHabitsStep, checkThisWeekCalendarEventsStep, checkWeekToDoTasksStep, getUserTimezoneStep, generateDayTasksStep, arrangeDayStep, DayPlanSteps } from '@/common/consts/shared';

export class DayPlanWorkflow {
  private checkpointer: MongoDBSaver;
  private graph: CompiledStateGraph<DailyPlanningState, UpdateType<DailyPlanStateType>, NodeType, DailyPlanStateType, DailyPlanStateType, StateDefinition>;

  constructor() {
    this.checkpointer = new MongoDBSaver({ client: getDbClient(), dbName: DatabaseName })

    const builder = new StateGraph(DailyPlanningAnnotation)
      // Add nodes.
      .addNode(checkLastWeekPlanStep, this.checkLastWeekPlan.bind(this))
      .addNode(checkRoutineAndHabitsStep, this.checkRoutineAndHabits.bind(this))
      .addNode(checkThisWeekCalendarEventsStep, this.checkThisWeekCalendarEvents.bind(this))
      .addNode(checkWeekToDoTasksStep, this.checkWeekToDoTasks.bind(this))
      .addNode(getUserTimezoneStep, this.getUserTimezone.bind(this))
      .addNode(generateDayTasksStep, this.generateDayTasks.bind(this))
      .addNode(arrangeDayStep, this.arrangeDay.bind(this))
      // Add edges.
      .addEdge(START, checkLastWeekPlanStep)
      .addEdge(checkLastWeekPlanStep, checkRoutineAndHabitsStep)
      .addEdge(checkRoutineAndHabitsStep, checkThisWeekCalendarEventsStep)
      .addEdge(checkThisWeekCalendarEventsStep, checkWeekToDoTasksStep)
      .addEdge(checkWeekToDoTasksStep, getUserTimezoneStep)
      .addEdge(getUserTimezoneStep, generateDayTasksStep)
      .addEdge(generateDayTasksStep, arrangeDayStep)
      .addEdge(arrangeDayStep, END)

    this.graph = builder.compile({ checkpointer: this.checkpointer })
  }

  private isCurrentStep(nodeKey: string, targetStep: number) {
    logger.debug(`Current step: ${nodeKey}`)
    return targetStep === DayPlanSteps[nodeKey]
  }

  private async checkLastWeekPlan(state: DailyPlanningState): Promise<NodeOutput> {
    // TODO: Maybe this week so far if planning on Sunday.
    if (!this.isCurrentStep(checkLastWeekPlanStep, state.targetStep)) {
      return {}
    }

    const lastWeekPlan = await getLastWeekPlan(
      state.userInfo._id,
      new Date(state.weekStartDate),
      state.userInfo.preferences?.timezone
    )

    return {
      lastWeekPlan,
      hasLastWeekPlan: lastWeekPlan.length > 0,
      targetStep: state.targetStep + 1,
    }
  }

  private async checkRoutineAndHabits(state: DailyPlanningState): Promise<NodeOutput> {
    if (!this.isCurrentStep(checkRoutineAndHabitsStep, state.targetStep)) {
      return {}
    }

    const habits = await getRoutineAndHabits(state.userInfo._id)

    return {
      hasRoutineOrHabits: habits.length > 0,
      habits,
      targetStep: habits.length > 0 ? state.targetStep + 1 : state.targetStep,
    }
  }

  private async checkThisWeekCalendarEvents(state: DailyPlanningState): Promise<NodeOutput> {
    if (!this.isCurrentStep(checkThisWeekCalendarEventsStep, state.targetStep)) {
      return {}
    }

    const weekInfo = getWeekInfo(new Date(state.weekStartDate), state.userInfo.preferences?.timezone)
    const thisWeekCalendarEvents = await getCalendarEvents(
      state.userInfo._id,
      weekInfo.weekStartDate,
      weekInfo.weekEndDate,
      state.userInfo.preferences?.timezone
    )

    return {
      thisWeekCalendarEvents,
      targetStep: state.targetStep + 1,
    }
  }

  private async checkWeekToDoTasks(state: DailyPlanningState): Promise<NodeOutput> {
    if (!this.isCurrentStep(checkWeekToDoTasksStep, state.targetStep)) {
      return {}
    }

    const todoTasks = state.conversation?.meta?.meta?.todoTasks || []
    const timezone = state.userInfo.preferences?.timezone

    return {
      weekToDoTasks: todoTasks?.map(t => {
        const dueDate = t.dueDate ? formatDateToWeekDayAndTime(t.dueDate, timezone) : ""
        const status = t.completed ? "Done" : "Not done"
        return `${t.title} - ${dueDate}: ${status}`
      }),
      targetStep: state.weekToDoTasksConfirmed ? state.targetStep + 1 : state.targetStep,
    }
  }

  private async getUserTimezone(state: DailyPlanningState): Promise<NodeOutput> {
    if (!this.isCurrentStep(getUserTimezoneStep, state.targetStep)) {
      return {}
    }

    return {
      targetStep: state.userInfo.preferences?.timezone ? state.targetStep + 1 : state.targetStep,
    }
  }

  private async generateDayTasks(state: DailyPlanningState): Promise<NodeOutput> {
    if (!this.isCurrentStep(generateDayTasksStep, state.targetStep)) {
      return {}
    }

    // TODO: May generate for today instead of tomorrow if it's not too late, or maybe ask for confirmation.
    // TODO: What if it's Sunday?
    const newState: Partial<DailyPlanningState> = {}
    const timezone = state.userInfo.preferences?.timezone
    const now = new Date()
    const nowInTz = dateInTimeZone(now, timezone)
    const weekStartDate = new Date(state.weekStartDate)
    const weekStartDateInTz = dateInTimeZone(weekStartDate, timezone)
    const isPlanThisWeek = isSameWeek(nowInTz, weekStartDateInTz, { weekStartsOn: 1 }) // TODO: What about week starts on Sun.
    const targetDayToPlanInTz = dateInTimeZone(state.targetDayToPlan, timezone)
    const isTargetDayToday = isSameDay(nowInTz, targetDayToPlanInTz)

    // Set initial planning date/time.
    let dateTimeToStartPlanning = isPlanThisWeek
      ? isTargetDayToday ? nowInTz : startOfDayInTimeZone(state.targetDayToPlan, timezone)
      : startOfDayInTimeZone(weekStartDate, timezone)

    // Check if it's late and adjust planning time if needed
    const isLateOnToday = isEvening(nowInTz)
    if (isLateOnToday && isPlanThisWeek) {
      if (!state.needToConfirmToPlanLate) {
        return {
          needToConfirmToPlanLate: true,
        }
      }

      if (!state.forcedToPlanLate) {
        return {
          targetStep: state.targetStep + 1,
        }
      }
    }

    const prompt = await ChatPromptTemplate.fromMessages([
      ["system", systemMessageShort],
      ["human", dayTasksSuggestTemplate],
    ]).formatMessages({
      now: formatDateToWeekDayAndDateTime(dateTimeToStartPlanning),
      user_info: userInformationPrompt(state.userInfo),
      habit: state.habits?.map(h => `- ${h}`).join('\n'),
      weekToDoTask: state.weekToDoTasks?.map(t => `- ${t}`).join('\n'),
      calendarLastWeekEvents: state.lastWeekPlan?.map(e => `- ${e}`).join('\n'),
      calendarEvents: state.thisWeekCalendarEvents?.map(e => `- ${e}`).join('\n'),
      instructions: dayActivitiesSuggestionInstruction(timezone, "today"),
    })
    const result = await getModel(ModelNameChatGPT4o).invoke(prompt)

    return {
      ...newState,
      dayActivitiesSuggestion: result.content,
      targetStep: state.targetStep + 1,
    }
  }

  private async arrangeDay(state: DailyPlanningState): Promise<NodeOutput> {
    if (!this.isCurrentStep(arrangeDayStep, state.targetStep)) {
      return {}
    }

    const timezone = state.userInfo.preferences?.timezone
    const targetDayActivities = await getCalendarEvents(
      state.userInfo._id,
      startOfDayInTimeZone(state.targetDayToPlan, timezone),
      endOfDayInTimeZone(state.targetDayToPlan, timezone),
      timezone
    )

    const prompt = await ChatPromptTemplate.fromMessages([
      ["system", systemMessageShort],
      ["human", dayActivitiesArrangeTemplate],
    ]).formatMessages({
      now: formatDateToWeekDayAndDateTime(state.targetDayToPlan),
      user_info: userInformationPrompt(state.userInfo),
      habit: state.habits?.map(h => `- ${h}`).join('\n'),
      targetDayActivities,
      activitiesToArrange: state.dayActivitiesSuggestion,
      instructions: dayActivitiesArrangeInstruction(timezone, "today"),
    })

    const result = await getModel(ModelNameChatGPT4o).invoke(prompt)

    return {
      dayActivitiesArrange: result.content,
      targetStep: state.targetStep + 1,
    }
  }

  async runWorkflow(initialState: Partial<DailyPlanningState> = {}, updateState?: UpdateState) {
    if (!initialState.userInfo || !initialState.conversationId || !initialState.targetDayToPlan) {
      throw new Error('User info, conversation ID and target day to plan are required')
    }

    const config: RunnableConfig = {
      configurable: { thread_id: `${initialState.conversationId.toHexString()}-${initialState.targetDayToPlan.getTime()}` }
    }

    const lastState = (await this.checkpointer.get(config))?.channel_values ?? {
      targetStep: DayPlanSteps.checkLastWeekPlan,
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

      const finalState: DailyPlanStateType = await this.graph.invoke({ ...lastState, ...initialState }, config);
      return finalState;
    } catch (error) {
      logger.error(`Error running workflow: ${error}`);
    }
  }
}

type DailyPlanningState = {
  targetStep: number
  targetDayToPlan: Date
  weekStartDate: Date
  userInfo: User
  conversationId: ObjectId
  conversation: Conversation | null
  hasLastWeekPlan: boolean
  lastWeekPlan: string[]
  hasRoutineOrHabits: boolean
  habits: string[]
  weekToDoTasks: string[]
  weekToDoTasksConfirmed: boolean
  needToConfirmToPlanLate: boolean
  forcedToPlanLate: boolean
  dislikeActivities: Set<string>
  dayActivitiesSuggestion: string | null
  dayActivitiesArrange: string | null
  thisWeekCalendarEvents: string[]
  messages: BaseMessage[]
}

type NodeType = typeof START | (keyof typeof DayPlanSteps)

type DailyPlanStateType = {
  targetStep: LastValue<number>
  targetDayToPlan: LastValue<Date>
  weekStartDate: LastValue<Date>
  userInfo: LastValue<User>
  conversationId: LastValue<ObjectId>
  conversation: LastValue<Conversation | null>
  hasLastWeekPlan: LastValue<boolean>
  lastWeekPlan: LastValue<string[]>
  hasRoutineOrHabits: LastValue<boolean>
  habits: LastValue<string[]>
  weekToDoTasks: LastValue<string[]>
  weekToDoTasksConfirmed: LastValue<boolean>
  needToConfirmToPlanLate: LastValue<boolean>
  forcedToPlanLate: LastValue<boolean>
  dislikeActivities: LastValue<Set<string>>
  dayActivitiesSuggestion: LastValue<string | null>
  dayActivitiesArrange: LastValue<string | null>
  thisWeekCalendarEvents: LastValue<string[]>
  messages: LastValue<Messages>
}

type NodeOutput = Partial<DailyPlanningState>

const DailyPlanningAnnotation = Annotation.Root({
  targetStep: Annotation<number>(),
  targetDayToPlan: Annotation<Date>(),
  weekStartDate: Annotation<Date>(),
  userInfo: Annotation<User>(),
  conversationId: Annotation<ObjectId>(),
  conversation: Annotation<Conversation | null>(),
  hasLastWeekPlan: Annotation<boolean>(),
  lastWeekPlan: Annotation<string[]>(),
  hasRoutineOrHabits: Annotation<boolean>(),
  habits: Annotation<string[]>(),
  weekToDoTasks: Annotation<string[]>(),
  weekToDoTasksConfirmed: Annotation<boolean>(),
  needToConfirmToPlanLate: Annotation<boolean>(),
  forcedToPlanLate: Annotation<boolean>(),
  dislikeActivities: Annotation<Set<string>>(),
  dayActivitiesSuggestion: Annotation<string | null>(),
  dayActivitiesArrange: Annotation<string | null>(),
  thisWeekCalendarEvents: Annotation<string[]>(),
  ...MessagesAnnotation.spec,
})

type UpdateState = {
  target: string,
  targetType: string,
  targetIndex?: number,
  value: any
}