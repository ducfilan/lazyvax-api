import { ObjectId } from "mongodb";
import { MessageTypes, SupportingLanguages } from "./consts";

export type LangCode = typeof SupportingLanguages[number]

export type MessageType = typeof MessageTypes[number]

export type ChatMessage = {
  type: MessageType,
  senderId?: ObjectId,
  content: string,
  conversationId: string,
}

export type User = {
  _id: ObjectId
  name: string
  email: string
  locale: string
  pictureUrl: string
  finishedRegisterStep: number
  conversations: Conversation[]
}

export type Conversation = {
  _id: ObjectId,
  type: string,
  title: string,
  description: string,
  unreadCount: number,
  participants: Participant[],
}

export type Participant = {
  _id: ObjectId,
  userId: ObjectId,
  name: string,
  pictureUrl: string
}

export type JoinConversationMessage = {
  conversationId: string,
}