import { StateGraph, START, END, CompiledStateGraph, LastValue, Messages, StateDefinition, UpdateType, Annotation, MessagesAnnotation } from '@langchain/langgraph';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
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
import { isSameDay } from 'date-fns';
import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
import { DatabaseName, getDbClient } from '@/common/configs/mongodb-client.config';
import { ObjectId } from 'mongodb';
import { getConversationById } from '@/services/api/conversations.services';
import { RunnableConfig } from '@langchain/core/runnables';
import { askMoreInfoInstruction, dayActivitiesArrangeInstruction, dayActivitiesArrangeTemplate, dayActivitiesSuggestionInstruction, dayTasksSuggestTemplate, systemMessageShort, userInformationPrompt } from './prompts';
import logger from '@/common/logger';
import { Conversation } from '@/entities/Conversation';
import { getModel, ModelNameChatGPT4o } from './model_repo';
import { getCalendarEvents, getLastWeekPlan, getRoutineAndHabits } from './utils';
import { checkLastWeekPlanStep, checkRoutineAndHabitsStep, checkThisWeekCalendarEventsStep, checkWeekToDoTasksStep, getUserTimezoneStep, generateDayTasksStep, arrangeDayStep, DayPlanSteps, ObjectiveTypeShort, ObjectiveTypeLong, askMoreInfoStep, checkObjectivesStep } from '@/common/consts/shared';
import { getObjectivesByUserId } from '@/services/api/objectives.services';
import { PlanQuestion } from '@/common/types/shared';
import { extractJsonFromMessage } from '@/common/utils/stringUtils';
import { ConversationMemory } from '@/entities/ConversationMemory';
import { getConversationMemoryByConversationId } from '@/services/api/conversation_memories.services';

export class DayPlanWorkflow {
  private checkpointer: MongoDBSaver;
  private graph: CompiledStateGraph<DailyPlanningState, UpdateType<DailyPlanStateType>, NodeType, DailyPlanStateType, DailyPlanStateType, StateDefinition>;

  constructor() {
    this.checkpointer = new MongoDBSaver({ client: getDbClient(), dbName: DatabaseName })

    const builder = new StateGraph(DailyPlanningAnnotation)
      // Add nodes.
      .addNode(checkLastWeekPlanStep, this.checkLastWeekPlan.bind(this))
      .addNode(checkObjectivesStep, this.checkObjectives.bind(this))
      .addNode(checkRoutineAndHabitsStep, this.checkRoutineAndHabits.bind(this))
      .addNode(checkThisWeekCalendarEventsStep, this.checkThisWeekCalendarEvents.bind(this))
      .addNode(checkWeekToDoTasksStep, this.checkWeekToDoTasks.bind(this))
      .addNode(getUserTimezoneStep, this.getUserTimezone.bind(this))
      .addNode(askMoreInfoStep, this.askMoreInfo.bind(this))
      .addNode(generateDayTasksStep, this.generateDayTasks.bind(this))
      .addNode(arrangeDayStep, this.arrangeDay.bind(this))
      // Add edges.
      .addEdge(START, checkLastWeekPlanStep)
      .addEdge(checkLastWeekPlanStep, checkObjectivesStep)
      .addEdge(checkObjectivesStep, checkRoutineAndHabitsStep)
      .addEdge(checkRoutineAndHabitsStep, checkThisWeekCalendarEventsStep)
      .addEdge(checkThisWeekCalendarEventsStep, checkWeekToDoTasksStep)
      .addEdge(checkWeekToDoTasksStep, getUserTimezoneStep)
      .addEdge(getUserTimezoneStep, askMoreInfoStep)
      .addEdge(askMoreInfoStep, generateDayTasksStep)
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
      targetStep: state.targetStep + 1,
    }
  }

  private async checkObjectives(state: DailyPlanningState): Promise<NodeOutput> {
    if (!this.isCurrentStep(checkObjectivesStep, state.targetStep)) {
      return {}
    }

    const objectives = await getObjectivesByUserId(state.userInfo._id)
    const shortTermGoals = objectives.filter(o => o.type === ObjectiveTypeShort).map(o => {
      const detail = o.detail ? ` - ${o.detail}` : ""
      const atAge = o.atAge ? ` - At age: ${o.atAge}` : ""
      return `${o.title}${detail}${atAge}`
    })
    const longTermGoals = objectives.filter(o => o.type === ObjectiveTypeLong).map(o => {
      const detail = o.detail ? ` - ${o.detail}` : ""
      const atAge = o.atAge ? ` - At age: ${o.atAge}` : ""
      return `${o.title}${detail}${atAge}`
    })

    return {
      shortTermGoals,
      longTermGoals,
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
    logger.debug("checkWeekToDoTasks todoTasks: " + todoTasks)
    const timezone = state.userInfo.preferences?.timezone

    return {
      weekToDoTasks: todoTasks?.map(t => {
        const dueDate = t.dueDate ? ` - Due date: ${formatDateToWeekDayAndTime(t.dueDate, timezone)}` : ""
        const duration = t.expectedDuration ? ` - Duration: ${t.expectedDuration}` : ""
        const status = t.completed ? "Done" : "Not done"
        return `${t.title}${duration}${dueDate}: ${status}`
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

  private async askMoreInfo(state: DailyPlanningState): Promise<NodeOutput> {
    if (!this.isCurrentStep(askMoreInfoStep, state.targetStep)) {
      return {}
    }

    const isQuestionsGenerated = state.questions !== null
    if (isQuestionsGenerated) {
      const noQuestions = state.questions?.length === 0
      return {
        targetStep: noQuestions || state.isQuestionsAnswered ? state.targetStep + 1 : state.targetStep,
      }
    }

    // TODO: May generate for today instead of tomorrow if it's not too late, or maybe ask for confirmation.
    // TODO: What if it's Sunday?
    const timezone = state.userInfo.preferences?.timezone
    const now = new Date()
    const nowInTz = dateInTimeZone(now, timezone)
    const targetDayToPlanInTz = dateInTimeZone(state.targetDayToPlan, timezone)
    const isTargetDayToday = isSameDay(nowInTz, targetDayToPlanInTz)

    // Set initial planning date/time.
    let dateTimeToStartPlanning = isTargetDayToday ? nowInTz : startOfDayInTimeZone(state.targetDayToPlan, timezone)

    const prompt = await ChatPromptTemplate.fromMessages([
      ["system", systemMessageShort],
      ["human", dayTasksSuggestTemplate],
    ]).formatMessages({
      now: formatDateToWeekDayAndDateTime(dateTimeToStartPlanning),
      user_info: userInformationPrompt(state.userInfo),
      habit: state.habits?.map(h => `- ${h}`).join('\n'),
      shortTermGoals: state.shortTermGoals?.map(t => `- ${t}`).join('\n'),
      longTermGoals: state.longTermGoals?.map(t => `- ${t}`).join('\n'),
      weekToDoTask: state.weekToDoTasks?.map(t => `- ${t}`).join('\n'),
      calendarLastWeekEvents: state.lastWeekPlan?.map(e => `- ${e}`).join('\n'),
      calendarEvents: state.thisWeekCalendarEvents?.map(e => `- ${e}`).join('\n'),
      dislikeActivities: state.dislikeActivities.size > 0 ? [...state.dislikeActivities].map(a => `- ${a}`).join('\n') : "Not specified",
      longTermMemory: state.userInfo.aiMemory,
      weekMemory: state.conversationMemory?.meta.weekAiMemory,
      dayMemory: state.conversationMemory?.meta.dayAiMemory[targetDayToPlanInTz.getDay()],
      instructions: askMoreInfoInstruction(),
    })
    const result = await getModel(ModelNameChatGPT4o).invoke(prompt)
    const { questions } = extractJsonFromMessage<{
      needMoreInfo: boolean,
      questions: PlanQuestion[],
    }>(result.content)

    return {
      questions,
    }
  }

  private async generateDayTasks(state: DailyPlanningState): Promise<NodeOutput> {
    if (!this.isCurrentStep(generateDayTasksStep, state.targetStep)) {
      return {}
    }

    // TODO: May generate for today instead of tomorrow if it's not too late, or maybe ask for confirmation.
    // TODO: What if it's Sunday?
    const timezone = state.userInfo.preferences?.timezone
    const now = new Date()
    const nowInTz = dateInTimeZone(now, timezone)
    const targetDayToPlanInTz = dateInTimeZone(state.targetDayToPlan, timezone)
    const isTargetDayToday = isSameDay(nowInTz, targetDayToPlanInTz)

    // Set initial planning date/time.
    let dateTimeToStartPlanning = isTargetDayToday ? nowInTz : startOfDayInTimeZone(state.targetDayToPlan, timezone)

    // Check if it's late and adjust planning time if needed
    const isLateOnToday = isEvening(nowInTz)
    if (isLateOnToday && isTargetDayToday) {
      if (state.dayActivitiesSuggestion) {
        return {
          needToConfirmToPlanLate: false,
          targetStep: state.targetStep + (state.dayActivitiesConfirmed ? 1 : 0)
        }
      }

      if (!state.needToConfirmToPlanLate) {
        return {
          needToConfirmToPlanLate: true,
        }
      }

      const isConfirmed = typeof state.forcedToPlanLate === 'boolean'
      if (!isConfirmed) {
        return {}
      }

      if (!state.forcedToPlanLate) {
        return {
          targetStep: state.targetStep + 1,
        }
      }
    }

    const isSuggested = state.dayActivitiesSuggestion?.length > 0
    if (isSuggested) {
      return state.dayActivitiesConfirmed ? {
        targetStep: state.targetStep + 1,
      } : {}
    }

    const questionsAnswersMessages = state.questions?.reduce((acc, q) => {
      return [...acc, new AIMessage(q.question), new HumanMessage(q.selectedAnswer)]
    }, [] as BaseMessage[])

    const prompt = await ChatPromptTemplate.fromMessages([
      ["system", systemMessageShort],
      ...questionsAnswersMessages,
      ["human", dayTasksSuggestTemplate],
    ]).formatMessages({
      now: formatDateToWeekDayAndDateTime(dateTimeToStartPlanning),
      user_info: userInformationPrompt(state.userInfo),
      habit: state.habits?.map(h => `- ${h}`).join('\n'),
      shortTermGoals: state.shortTermGoals?.map(t => `- ${t}`).join('\n'),
      longTermGoals: state.longTermGoals?.map(t => `- ${t}`).join('\n'),
      weekToDoTask: state.weekToDoTasks?.map(t => `- ${t}`).join('\n'),
      calendarLastWeekEvents: state.lastWeekPlan?.map(e => `- ${e}`).join('\n'),
      calendarEvents: state.thisWeekCalendarEvents?.map(e => `- ${e}`).join('\n'),
      dislikeActivities: state.dislikeActivities.size > 0 ? [...state.dislikeActivities].map(a => `- ${a}`).join('\n') : "Not specified",
      longTermMemory: state.userInfo.aiMemory,
      weekMemory: state.conversationMemory?.meta.weekAiMemory,
      dayMemory: state.conversationMemory?.meta.dayAiMemory[targetDayToPlanInTz.getDay()],
      instructions: dayActivitiesSuggestionInstruction(timezone, "today"),
    })
    const result = await getModel(ModelNameChatGPT4o).invoke(prompt)

    return {
      dayActivitiesSuggestion: result.content,
      targetStep: state.dayActivitiesConfirmed ? state.targetStep + 1 : state.targetStep,
    }
  }

  private async arrangeDay(state: DailyPlanningState): Promise<NodeOutput> {
    if (!this.isCurrentStep(arrangeDayStep, state.targetStep) || !state.dayActivitiesToArrange?.length) {
      return {}
    }

    const isArranged = state.dayActivitiesArrange?.length > 0
    if (isArranged) {
      return {}
    }

    const timezone = state.userInfo.preferences?.timezone
    const now = new Date()
    const nowInTz = dateInTimeZone(now, timezone)
    const targetDayToPlanInTz = dateInTimeZone(state.targetDayToPlan, timezone)
    const isTargetDayToday = isSameDay(nowInTz, targetDayToPlanInTz)
    let dateTimeToStartPlanning = isTargetDayToday ? nowInTz : startOfDayInTimeZone(state.targetDayToPlan, timezone)
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
      now: formatDateToWeekDayAndDateTime(dateTimeToStartPlanning),
      user_info: userInformationPrompt(state.userInfo),
      habit: state.habits?.map(h => `- ${h}`).join('\n'),
      targetDayActivities,
      activitiesToArrange: state.dayActivitiesToArrange,
      instructions: dayActivitiesArrangeInstruction(timezone, "today"),
    })

    const result = await getModel(ModelNameChatGPT4o).invoke(prompt)

    return {
      dayActivitiesArrange: result.content,
    }
  }

  async runWorkflow(initialState: Partial<DailyPlanningState> = {}, updateState?: UpdateState) {
    if (!initialState.userInfo || !initialState.conversationId || !initialState.targetDayToPlan) {
      throw new Error('User info, conversation ID and target day to plan are required')
    }

    const config: RunnableConfig = {
      configurable: { thread_id: `${initialState.conversationId.toHexString()}-${initialState.targetDayToPlan.getTime()}` }
    }

    try {
      const lastState = (await this.checkpointer.get(config))?.channel_values ?? {
        targetStep: DayPlanSteps.checkLastWeekPlan,
        dislikeActivities: new Set(),
        conversationMemory: null,
      }

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

      if (!lastState.conversationMemory) {
        const conversationMemory = await getConversationMemoryByConversationId(initialState.conversationId)
        if (!conversationMemory) {
          throw new Error(`Conversation memory not found: ${initialState.conversationId}`)
        }
        lastState.conversationMemory = conversationMemory
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

      const finalState: DailyPlanningState = await this.graph.invoke({ ...lastState, ...initialState }, config);
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
  lastWeekPlan: string[]
  hasRoutineOrHabits: boolean
  habits: string[]
  shortTermGoals: string[]
  longTermGoals: string[]
  weekToDoTasks: string[]
  weekToDoTasksConfirmed: boolean
  needToConfirmToPlanLate: boolean
  forcedToPlanLate: boolean
  dislikeActivities: Set<string>
  questions: PlanQuestion[]
  dayActivitiesSuggestion: string | null
  dayActivitiesConfirmed: boolean
  dayActivitiesToArrange: string[]
  dayActivitiesArrange: string | null
  thisWeekCalendarEvents: string[]
  messages: BaseMessage[]
  isQuestionsAnswered: boolean
  conversationMemory: ConversationMemory | null
}

type NodeType = typeof START | (keyof typeof DayPlanSteps)

type DailyPlanStateType = {
  targetStep: LastValue<number>
  targetDayToPlan: LastValue<Date>
  weekStartDate: LastValue<Date>
  userInfo: LastValue<User>
  conversationId: LastValue<ObjectId>
  conversation: LastValue<Conversation | null>
  lastWeekPlan: LastValue<string[]>
  hasRoutineOrHabits: LastValue<boolean>
  habits: LastValue<string[]>
  shortTermGoals: LastValue<string[]>
  longTermGoals: LastValue<string[]>
  weekToDoTasks: LastValue<string[]>
  weekToDoTasksConfirmed: LastValue<boolean>
  needToConfirmToPlanLate: LastValue<boolean>
  forcedToPlanLate: LastValue<boolean>
  questions: LastValue<PlanQuestion[]>
  dislikeActivities: LastValue<Set<string>>
  dayActivitiesSuggestion: LastValue<string | null>
  dayActivitiesConfirmed: LastValue<boolean>
  dayActivitiesToArrange: LastValue<string[]>
  dayActivitiesArrange: LastValue<string | null>
  thisWeekCalendarEvents: LastValue<string[]>
  messages: LastValue<Messages>
  isQuestionsAnswered: LastValue<boolean>
  conversationMemory: LastValue<ConversationMemory | null>
}

type NodeOutput = Partial<DailyPlanningState>

const DailyPlanningAnnotation = Annotation.Root({
  targetStep: Annotation<number>(),
  targetDayToPlan: Annotation<Date>(),
  weekStartDate: Annotation<Date>(),
  userInfo: Annotation<User>(),
  conversationId: Annotation<ObjectId>(),
  conversation: Annotation<Conversation | null>(),
  lastWeekPlan: Annotation<string[]>(),
  hasRoutineOrHabits: Annotation<boolean>(),
  habits: Annotation<string[]>(),
  shortTermGoals: Annotation<string[]>(),
  longTermGoals: Annotation<string[]>(),
  weekToDoTasks: Annotation<string[]>(),
  weekToDoTasksConfirmed: Annotation<boolean>(),
  needToConfirmToPlanLate: Annotation<boolean>(),
  forcedToPlanLate: Annotation<boolean>(),
  questions: Annotation<PlanQuestion[]>(),
  dislikeActivities: Annotation<Set<string>>(),
  dayActivitiesSuggestion: Annotation<string | null>(),
  dayActivitiesConfirmed: Annotation<boolean>(),
  dayActivitiesToArrange: Annotation<string[]>(),
  dayActivitiesArrange: Annotation<string | null>(),
  thisWeekCalendarEvents: Annotation<string[]>(),
  isQuestionsAnswered: Annotation<boolean>(),
  conversationMemory: Annotation<ConversationMemory | null>(),
  ...MessagesAnnotation.spec,
})

type UpdateState = {
  target: string,
  targetType: string,
  targetIndex?: number,
  value: any
}