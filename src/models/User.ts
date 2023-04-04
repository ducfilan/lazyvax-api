import { LangCode } from "@/common/types";
import { ObjectId } from "mongodb";

export default interface User {
  _id: ObjectId,
  type: string,
  serviceAccessToken: string,
  finishedRegisterStep: number,
  name: string,
  email: string,
  locale: LangCode,
  password?: string,
  pictureUrl: string,
  preferences?: Preference,
  conversations?: Conversation[]
}

export interface Preference {
  botName: string,
  userCategory: UserCategory,
  age?: number,
  gender?: Gender,
  workerType?: WorkerType,
  occupation?: string,
  lifeGoals?: string[],
}

export type UserCategory = "professional" | "student"
export type WorkerType = "individual" | "manager" | "both"
export type Gender = "male" | "female" | "other"

export interface Conversation {
  _id: ObjectId,
  type: string,
  title: string,
  description: string,
  unreadCount: number,
  participants: ConversationMember[],
}

export interface ConversationMember {
  _id: ObjectId,
  userId: ObjectId,
  name: string,
  pictureUrl: string
}
