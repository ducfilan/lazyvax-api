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
  hasRoutineOrHabits: Annotation<boolean>(),
  habits: Annotation<string[]>(),
  weekToDoTasks: Annotation<string[]>(),
  coreTasks: Annotation<string[]>(),
  isUserSatisfiedWithCoreTasks: Annotation<boolean>(),
  unimportantTasks: Annotation<string[]>(),
  isUserSatisfiedWithUnimportantTasks: Annotation<boolean>(),
  calendarEvents: Annotation<string[]>(),
  motivationMessage: Annotation<string>(),
  ...MessagesAnnotation.spec,
})
