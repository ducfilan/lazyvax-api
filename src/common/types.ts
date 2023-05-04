import { MessageTypes, SupportingLanguages } from "./consts";

export type LangCode = typeof SupportingLanguages[number]

export type MessageType = typeof MessageTypes[number]

export type ChatMessage = {
  id?: string,
  type: MessageType,
  senderId?: string,
  content: string,
  parentContent?: string,
  parentId?: string,
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
