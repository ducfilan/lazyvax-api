import { ObjectId } from "mongodb";

export type User = {
  _id: ObjectId,
  name: string,
  email: string,
  locale: string,
  pictureUrl: string,
  finishedRegisterStep: number,
  langCodes?: string[],
  pages?: string[],
}
