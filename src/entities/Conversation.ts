import { ConversationType, MilestoneSource } from "@/common/types/types"
import { ObjectId } from "mongodb"

export type Conversation = {
  _id?: ObjectId,
  userId?: ObjectId,
  type: string,
  meta?: {
    type: ConversationType
    meta: {
      startDate: Date,
      todoTasks?: TodoTask[],
    }
  },
  unreadCount: number,
  participants: Participant[],
}

export type TodoTask = {
  _id?: ObjectId,
  title: string,
  description?: string,
  priority?: number,
  progress?: number,
  tags?: string[],
  status: number,
  completed: boolean,
  expectedDuration?: number;
  dueDate: Date,
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
