import { MessageTypes, MilestoneSources, SupportingLanguages } from "./consts";

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

export type CreateNewGoalMessage = {
  conversation: {
    type: string,
    title: string,
    description: string,
    unreadCount: number,
    participants: {
      userId: string
    }[],
  },
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
