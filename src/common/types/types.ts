import { ObjectId } from "mongodb";
import { ConversationTypes, MilestoneSources, PlanTypeWeekFull, PlanTypeWeekInteractive, SupportingLanguages } from "@/common/consts/constants";
import { EventMeta } from "@/entities/Event";
import { MessageTypes } from "@/common/consts/message-types";
import { formatDateToWeekDayAndTime } from "@common/utils/dateUtils";

export type LangCode = typeof SupportingLanguages[number]

export type MessageType = typeof MessageTypes[number]

export type ChatMessage = {
  id?: string,
  type: MessageType,
  senderId?: string,
  content: string,
  parentContent?: string,
  parentId?: string,
  needResponse?: boolean,
  conversationId: string,
}

export type JoinConversationMessage = {
  conversationId: string,
}

export type FinishQuestionnairesMessage = {
  conversationId: string,
}

export type GetNextSmartQuestionMessage = {
  authorId: string,
  conversationId: string,
}

export type CreateConversationMessage = {
  conversation: CreateConversationMessageConversation,
}

export type CreateConversationMessageConversation = {
  type: string,
  meta: { [key: string]: any },
  unreadCount: number,
  participants: {
    userId: string
  }[],
}

export type AddMilestoneAndActionsMessage = {
  conversationId: string,
  milestoneId: string,
  source: number,
  milestone: string,
  actions: string[]
}

export type EditMilestoneMessage = {
  conversationId: string,
  milestoneId: string,
  milestone: string,
}

export type NextMilestoneAndActionsMessage = {
  conversationId: string,
  milestoneId: string,
}

export type AddActionMessage = {
  conversationId: string,
  milestoneId: string,
  action: string,
}

export type EditActionMessage = {
  conversationId: string,
  milestoneId: string,
  actionId: string,
  action: string,
  isDone?: boolean,
}

export type GoogleUserInfo = {
  email: string
  email_verified: boolean
  family_name: string
  given_name: string
  locale: string
  name: string
  picture: string
}

export type MilestoneSource = typeof MilestoneSources[number]

export type MessageContent = {
  type: number,
  content: string,
  parentId?: string,
  isResponded?: boolean,
  parentContent?: string
}

export type GenerateWeekPlanFullMessage = {
  conversationId: string,
}

export type ConfirmWeekToDoTasksMessage = {
  conversationId: string,
}

export type ConversationType = typeof ConversationTypes[number]

export type GetEventFilters = {
  userId: ObjectId,
  from: Date,
  to: Date,
  source?: string,
  type?: ConversationType,
  calendarId?: string,
  categories?: string[],
  meta?: EventMeta,
  limit?: number
}

export interface WeekInfo {
  weekNumber: number;
  weekStartDate: Date;
  weekEndDate: Date;
  weekSubject?: string;
  weekSubjectSub?: string;
}

export type WeekPlanType = typeof PlanTypeWeekFull | typeof PlanTypeWeekInteractive

export class ActivitySuggestion {
  activity: string;
  start_time: string;
  end_time: string;
  reason: string;
  reminder: number[];

  toString(): string {
    return `[${formatDateToWeekDayAndTime(new Date(this.start_time))} - ${formatDateToWeekDayAndTime(new Date(this.end_time))}] ${this.activity}`
  }
}
