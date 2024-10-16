import { MilestoneSource } from "@/common/types"
import { ObjectId } from "mongodb"

export type Conversation = {
  _id?: ObjectId,
  type: string,
  meta?: object,
  unreadCount: number,
  participants: Participant[],
}

export type Participant = {
  _id: ObjectId,
  name: string,
  pictureUrl: string,
}

export type UserMilestone = {
  _id: ObjectId,
  milestone: string,
  source: MilestoneSource,
  isDone?: boolean,
  actions: {
    _id: ObjectId,
    action: string,
    isDone?: boolean,
  }[]
}

export type MilestoneSuggestion = {
  _id?: ObjectId,
  isSuggested?: boolean,
  milestone: string,
  actions: string[],
}

export type SmartQuestion = {
  content: string,
  answerType: AnswerType,
  unit?: string, // example: "days"
  selection?: { type: "single" | "multiple", options: string[] },
  answer?: string,
  answerUserId?: ObjectId,
}

type AnswerType =
  | "text"
  | "number"
  | "date"
  | "selection"
