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
  age?: number,
  gender?: Gender,
  workerType?: WorkerType,
  occupation?: string,
  lifeGoals?: string[],
}

export type UserCategory = "professional" | "student"
export type WorkerType = "individual" | "manager" | "both"
export type Gender = "male" | "female" | "other"
