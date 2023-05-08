import { ObjectId } from "mongodb"

export type Conversation = {
  _id?: ObjectId,
  type: string,
  title: string,
  description: string,
  unreadCount: number,
  smartQuestions?: SmartQuestion[],
  participants: Participant[],
}

export type Participant = {
  _id: ObjectId,
  name: string,
  pictureUrl: string
}

export type SmartQuestion = {
  content: string;
  answerType: AnswerType;
  unit?: string; // example: "days"
  selection?: { type: "single" | "multiple", options: string[] }
  answer?: string,
  answerUserId?: ObjectId,
}

type AnswerType =
  | "text"
  | "number"
  | "date"
  | "selection"
