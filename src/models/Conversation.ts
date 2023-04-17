import { ObjectId } from "mongodb"

export type Conversation = {
  _id?: ObjectId,
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