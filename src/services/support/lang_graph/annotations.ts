import { WeekPlanType } from '@/common/types/types'
import { User } from '@/entities/User'
import { Annotation, MessagesAnnotation } from '@langchain/langgraph'
import { ObjectId } from 'mongodb'

export const WeeklyPlanningAnnotation = Annotation.Root({
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
  coreTasks: Annotation<string[]>(),
  isUserSatisfiedWithCoreTasks: Annotation<boolean>(),
  unimportantTasks: Annotation<string[]>(),
  isUserSatisfiedWithUnimportantTasks: Annotation<boolean>(),
  calendarEvents: Annotation<string[]>(),
  motivationMessage: Annotation<string>(),
  ...MessagesAnnotation.spec,
})
