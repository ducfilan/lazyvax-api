import { LangCode } from "@/common/types";
import { ObjectId } from "mongodb";
import { Conversation } from "./Conversation";

export type User = {
  _id: ObjectId,
  type: string,
  serviceAccessToken?: string,
  finishedRegisterStep: number,
  name: string,
  email: string,
  locale: LangCode,
  password?: string,
  pictureUrl: string,
  preferences?: Preference,
  conversations?: Conversation[]
}

export type Preference = {
  userCategory?: UserCategory,
  age?: AgeGroup,
  gender?: Gender,
  workerType?: WorkerType,
  occupation?: string,
  degree?: string,
  studyCourse?: string,
  futureSelf?: string[],
}

export type UserCategory = "professional" | "student"
export type AgeGroup = "< 18" | "18-24" | "25-34" | "35-44" | "45-54" | "55-64" | "> 65"
export type WorkerType = "individual" | "manager" | "both"
export type Gender = "male" | "female" | "other"
